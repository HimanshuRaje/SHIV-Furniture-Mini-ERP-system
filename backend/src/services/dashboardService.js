const prisma = require('../lib/prisma');

/**
 * Get all dashboard data in a single call
 */
const getDashboardData = async () => {
  const [
    totalSalesOrders,
    pendingDeliveries,
    totalPurchaseOrders,
    pendingReceipts,
    activeManufacturing,
    totalProducts,
    totalVendors,
    totalUsers,
    totalBoms,
    salesOrdersByStatus,
    purchaseOrdersByStatus,
    manufacturingByStatus,
    lowStockCount,
    lowStockItems,
    recentActivity,
    recentSalesOrders,
    recentPurchaseOrders,
    recentManufacturingOrders,
    recentStockMovements,
    products,
    vendors,
    users,
    boms,
  ] = await Promise.all([
    prisma.salesOrder.count(),
    prisma.salesOrder.count({
      where: { status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED'] } },
    }),
    prisma.purchaseOrder.count(),
    prisma.purchaseOrder.count({
      where: { status: { in: ['CONFIRMED', 'PARTIALLY_RECEIVED'] } },
    }),
    prisma.manufacturingOrder.count({
      where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
    }),
    prisma.product.count(),
    prisma.vendor.count(),
    prisma.user.count(),
    prisma.bom.count(),
    prisma.salesOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.purchaseOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.manufacturingOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.product.count({
      where: {
        onHandQty: { lte: prisma.product.fields.reorderPoint },
      },
    }),
    prisma.product.findMany({
      where: {
        onHandQty: { lte: prisma.product.fields.reorderPoint },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        onHandQty: true,
        reservedQty: true,
        reorderPoint: true,
        vendor: { select: { id: true, name: true } },
      },
      orderBy: [{ onHandQty: 'asc' }, { name: 'asc' }],
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNo: true,
        customerName: true,
        status: true,
        orderDate: true,
        createdAt: true,
        lines: { select: { qty: true, deliveredQty: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        orderDate: true,
        createdAt: true,
        vendor: { select: { id: true, name: true } },
        lines: { select: { qty: true, receivedQty: true } },
      },
    }),
    prisma.manufacturingOrder.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        qty: true,
        status: true,
        createdAt: true,
        product: { select: { id: true, name: true, sku: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.stockLedger.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        movementType: true,
        qtyChange: true,
        reference: true,
        referenceType: true,
        createdAt: true,
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        type: true,
        status: true,
        salesPrice: true,
        costPrice: true,
        onHandQty: true,
        reservedQty: true,
        procurementStrategy: true,
        procurementType: true,
        reorderPoint: true,
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        contact: true,
        email: true,
        phone: true,
        gstNumber: true,
        _count: {
          select: {
            products: true,
            purchaseOrders: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.bom.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        notes: true,
        createdAt: true,
        product: { select: { id: true, name: true, sku: true } },
        _count: {
          select: {
            components: true,
            operations: true,
            manufacturingOrders: true,
          },
        },
      },
    }),
  ]);

  const toStatusMap = (rows) =>
    rows.reduce((acc, row) => {
      acc[row.status] = row._count.id;
      return acc;
    }, {});

  return {
    totalSalesOrders,
    pendingDeliveries,
    totalPurchaseOrders,
    pendingReceipts,
    activeManufacturing,
    lowStockCount,
    totalProducts,
    totalVendors,
    totalUsers,
    totalBoms,
    salesByStatus: toStatusMap(salesOrdersByStatus),
    purchaseByStatus: toStatusMap(purchaseOrdersByStatus),
    manufacturingByStatus: toStatusMap(manufacturingByStatus),
    lowStockItems,
    recentActivity: recentActivity.map((log) => ({
      id: log.id,
      module: log.module,
      action: log.action,
      referenceId: log.referenceId,
      createdAt: log.createdAt,
      userName: log.changedBy?.name,
      user: log.changedBy,
    })),
    recentSalesOrders,
    recentPurchaseOrders,
    recentManufacturingOrders,
    recentStockMovements,
    products,
    vendors,
    users,
    boms,
  };
};

module.exports = { getDashboardData };
