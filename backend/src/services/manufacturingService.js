const prisma = require('../lib/prisma');
const auditService = require('./auditService');
const inventoryService = require('./inventoryService');
const procurementService = require('./procurementService');

const moIncludes = {
  product: true,
  bom: {
    include: {
      components: {
        include: { componentProduct: true },
      },
      operations: true,
    },
  },
  workOrders: true,
  assignedTo: {
    select: { id: true, name: true, email: true, role: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
};

/**
 * Get all manufacturing orders
 */
const getAllManufacturingOrders = async () => {
  return prisma.manufacturingOrder.findMany({
    include: moIncludes,
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get single manufacturing order by ID
 */
const getManufacturingOrderById = async (id) => {
  return prisma.manufacturingOrder.findUnique({
    where: { id },
    include: moIncludes,
  });
};

/**
 * Create a new manufacturing order with auto-created work orders
 */
const createManufacturingOrder = async ({ productId, qty, bomId, assignedToId, createdById }) => {
  // Step 1: Fetch BoM (read — no transaction)
  const bom = await prisma.bom.findUnique({
    where: { id: bomId },
    include: { operations: true },
  });

  if (!bom) throw new Error('BoM not found.');

  // Step 2: Create the MO without nested relations (single round-trip)
  const mo = await prisma.manufacturingOrder.create({
    data: {
      productId,
      qty,
      bomId,
      status: 'DRAFT',
      assignedToId: assignedToId || null,
      createdById,
    },
  });

  // Step 3: Create work orders individually (each is its own round-trip)
  if (bom.operations.length > 0) {
    await prisma.workOrder.createMany({
      data: bom.operations.map((op) => ({
        moId: mo.id,
        operationName: op.name,
        workCenter: op.workCenter,
        durationMins: op.durationMins,
        status: 'PENDING',
      })),
    });
  }

  // Step 4: Audit log (single round-trip)
  await prisma.auditLog.create({
    data: {
      module: 'MANUFACTURING',
      action: 'CREATE',
      referenceId: mo.id,
      changedById: createdById,
      afterData: { productId, qty, bomId, assignedToId },
    },
  });

  // Step 5: Fetch and return the full MO with all relations
  return prisma.manufacturingOrder.findUnique({
    where: { id: mo.id },
    include: moIncludes,
  });
};



/**
 * Update a draft manufacturing order
 */
const updateManufacturingOrder = async (id, data) => {
  const existing = await prisma.manufacturingOrder.findUnique({ where: { id } });

  if (!existing) throw new Error('Manufacturing order not found.');
  if (existing.status !== 'DRAFT') throw new Error('Only DRAFT orders can be updated.');

  const updateData = {};
  if (data.productId !== undefined) updateData.productId = data.productId;
  if (data.qty !== undefined) updateData.qty = data.qty;
  if (data.bomId !== undefined) updateData.bomId = data.bomId;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

  const mo = await prisma.manufacturingOrder.update({
    where: { id },
    data: updateData,
    include: moIncludes,
  });

  await auditService.createAuditLog({
    module: 'MANUFACTURING',
    action: 'UPDATE',
    referenceId: id,
    changedById: data.userId || existing.createdById,
    beforeData: existing,
    afterData: data,
  });

  return mo;
};

/**
 * Delete a draft manufacturing order
 */
const deleteManufacturingOrder = async (id, userId) => {
  const existing = await prisma.manufacturingOrder.findUnique({ where: { id } });

  if (!existing) throw new Error('Manufacturing order not found.');
  if (existing.status !== 'DRAFT') throw new Error('Only DRAFT orders can be deleted.');

  await prisma.$transaction(async (tx) => {
    await tx.manufacturingOrder.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        module: 'MANUFACTURING',
        action: 'DELETE',
        referenceId: id,
        changedById: userId,
        beforeData: existing,
      },
    });
  });

  return { message: 'Manufacturing order deleted successfully.' };
};

/**
 * Confirm a manufacturing order — reserves component stock, triggers procurement for shortfalls
 */
const confirmManufacturingOrder = async (id, userId) => {
  const mo = await prisma.manufacturingOrder.findUnique({
    where: { id },
    include: {
      bom: {
        include: {
          components: {
            include: { componentProduct: true },
          },
        },
      },
    },
  });

  if (!mo) throw new Error('Manufacturing order not found.');
  if (mo.status !== 'DRAFT') throw new Error('Only DRAFT orders can be confirmed.');

  // Collect procurement needs
  const procurementNeeds = [];

  await prisma.$transaction(async (tx) => {
    for (const component of mo.bom.components) {
      const neededQty = component.qty * mo.qty;
      const product = await tx.product.findUnique({ where: { id: component.componentProductId } });
      const freeToUseQty = product.onHandQty - product.reservedQty;

      if (freeToUseQty >= neededQty) {
        // Sufficient stock — reserve
        await tx.product.update({
          where: { id: product.id },
          data: { reservedQty: { increment: neededQty } },
        });
      } else {
        // Reserve what's available
        if (freeToUseQty > 0) {
          await tx.product.update({
            where: { id: product.id },
            data: { reservedQty: { increment: freeToUseQty } },
          });
        }
        const shortfall = neededQty - freeToUseQty;
        procurementNeeds.push({
          productId: product.id,
          qty: shortfall,
        });
      }
    }

    // Update status to CONFIRMED
    await tx.manufacturingOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    await tx.auditLog.create({
      data: {
        module: 'MANUFACTURING',
        action: 'CONFIRM',
        referenceId: id,
        changedById: userId,
        afterData: { status: 'CONFIRMED' },
      },
    });
  });

  // Phase 2: Trigger procurement outside transaction
  const procurementNotifications = [];
  for (const need of procurementNeeds) {
    try {
      const result = await procurementService.triggerProcurement({
        productId: need.productId,
        qty: need.qty,
        reference: `MO-${id}`,
        userId,
      });
      procurementNotifications.push(result);
    } catch (error) {
      procurementNotifications.push({
        type: 'ERROR',
        productId: need.productId,
        message: error.message,
      });
    }
  }

  const updatedOrder = await prisma.manufacturingOrder.findUnique({
    where: { id },
    include: moIncludes,
  });

  return { order: updatedOrder, procurementNotifications };
};

/**
 * Cancel a manufacturing order — unreserves any reserved component stock
 */
const cancelManufacturingOrder = async (id, userId) => {
  const mo = await prisma.manufacturingOrder.findUnique({
    where: { id },
    include: {
      bom: {
        include: {
          components: {
            include: { componentProduct: true },
          },
        },
      },
    },
  });

  if (!mo) throw new Error('Manufacturing order not found.');
  if (!['DRAFT', 'CONFIRMED'].includes(mo.status)) {
    throw new Error('Only DRAFT or CONFIRMED orders can be cancelled.');
  }

  await prisma.$transaction(async (tx) => {
    // If CONFIRMED, unreserve the component quantities that were reserved
    if (mo.status === 'CONFIRMED') {
      for (const component of mo.bom.components) {
        const neededQty = component.qty * mo.qty;
        const product = await tx.product.findUnique({ where: { id: component.componentProductId } });
        const releaseQty = Math.min(product.reservedQty, neededQty);
        if (releaseQty > 0) {
          await tx.product.update({
            where: { id: product.id },
            data: { reservedQty: { decrement: releaseQty } },
          });
        }
      }
    }

    await tx.manufacturingOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await tx.auditLog.create({
      data: {
        module: 'MANUFACTURING',
        action: 'CANCEL',
        referenceId: id,
        changedById: userId,
        beforeData: { status: mo.status },
        afterData: { status: 'CANCELLED' },
      },
    });
  });

  return prisma.manufacturingOrder.findUnique({
    where: { id },
    include: moIncludes,
  });
};

/**
 * Start a manufacturing order
 */
const startManufacturingOrder = async (id, userId) => {
  const existing = await prisma.manufacturingOrder.findUnique({ where: { id } });

  if (!existing) throw new Error('Manufacturing order not found.');
  if (existing.status !== 'CONFIRMED') throw new Error('Only CONFIRMED orders can be started.');

  await prisma.$transaction(async (tx) => {
    await tx.manufacturingOrder.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await tx.auditLog.create({
      data: {
        module: 'MANUFACTURING',
        action: 'START',
        referenceId: id,
        changedById: userId,
        beforeData: { status: 'CONFIRMED' },
        afterData: { status: 'IN_PROGRESS' },
      },
    });
  });

  return prisma.manufacturingOrder.findUnique({
    where: { id },
    include: moIncludes,
  });
};

/**
 * Complete a manufacturing order — consumes components, produces finished product
 */
const completeManufacturingOrder = async (id, userId) => {
  const mo = await prisma.manufacturingOrder.findUnique({
    where: { id },
    include: {
      bom: {
        include: {
          components: {
            include: { componentProduct: true },
          },
        },
      },
    },
  });

  if (!mo) throw new Error('Manufacturing order not found.');
  if (mo.status !== 'IN_PROGRESS') throw new Error('Only IN_PROGRESS orders can be completed.');

  await prisma.$transaction(async (tx) => {
    // Consume components
    for (const component of mo.bom.components) {
      const consumeQty = component.qty * mo.qty;

      await tx.product.update({
        where: { id: component.componentProductId },
        data: {
          onHandQty: { decrement: consumeQty },
          reservedQty: { decrement: consumeQty },
        },
      });

      // Stock ledger — component consumed
      await tx.stockLedger.create({
        data: {
          productId: component.componentProductId,
          movementType: 'MFG_OUT',
          qtyChange: -consumeQty,
          reference: `MO-${id}`,
          referenceType: 'MANUFACTURING_ORDER',
          createdById: userId,
        },
      });
    }

    // Produce finished product
    await tx.product.update({
      where: { id: mo.productId },
      data: { onHandQty: { increment: mo.qty } },
    });

    // Stock ledger — finished product in
    await tx.stockLedger.create({
      data: {
        productId: mo.productId,
        movementType: 'MFG_IN',
        qtyChange: mo.qty,
        reference: `MO-${id}`,
        referenceType: 'MANUFACTURING_ORDER',
        createdById: userId,
      },
    });

    // Update status to DONE
    await tx.manufacturingOrder.update({
      where: { id },
      data: { status: 'DONE' },
    });

    await tx.auditLog.create({
      data: {
        module: 'MANUFACTURING',
        action: 'COMPLETE',
        referenceId: id,
        changedById: userId,
        afterData: { status: 'DONE', producedQty: mo.qty },
      },
    });
  });

  return prisma.manufacturingOrder.findUnique({
    where: { id },
    include: moIncludes,
  });
};

/**
 * Update a work order status
 */
const updateWorkOrder = async (woId, data) => {
  const wo = await prisma.workOrder.findUnique({ where: { id: woId } });
  if (!wo) throw new Error('Work order not found.');

  return prisma.workOrder.update({
    where: { id: woId },
    data: {
      status: data.status,
    },
  });
};

module.exports = {
  getAllManufacturingOrders,
  getManufacturingOrderById,
  createManufacturingOrder,
  updateManufacturingOrder,
  deleteManufacturingOrder,
  confirmManufacturingOrder,
  cancelManufacturingOrder,
  startManufacturingOrder,
  completeManufacturingOrder,
  updateWorkOrder,
};
