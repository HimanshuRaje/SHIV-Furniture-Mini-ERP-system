const prisma = require('../lib/prisma');

/**
 * GET /api/vendors/:id/history
 * Returns full purchase transaction history for a vendor
 */
const getHistory = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id);

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: true,
        purchaseOrders: {
          include: {
            lines: {
              include: { product: true },
            },
            createdBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }

    // ── Aggregated statistics ──────────────────────────────────
    const orders = vendor.purchaseOrders;

    const totalOrders = orders.length;
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
    const activeOrders = orders.filter((o) => !['CANCELLED'].includes(o.status)).length;

    let totalAmount = 0;
    let totalReceivedAmount = 0;
    const productMap = {};

    for (const order of orders) {
      for (const line of order.lines) {
        const lineTotal = Number(line.unitCost) * line.qty;
        const lineReceived = Number(line.unitCost) * line.receivedQty;

        if (order.status !== 'CANCELLED') {
          totalAmount += lineTotal;
          totalReceivedAmount += lineReceived;
        }

        // Per-product aggregation (exclude cancelled)
        if (order.status !== 'CANCELLED') {
          const pid = line.productId;
          if (!productMap[pid]) {
            productMap[pid] = {
              product: line.product,
              totalQtyOrdered: 0,
              totalQtyReceived: 0,
              totalAmount: 0,
              orderCount: 0,
            };
          }
          productMap[pid].totalQtyOrdered += line.qty;
          productMap[pid].totalQtyReceived += line.receivedQty;
          productMap[pid].totalAmount += lineTotal;
          productMap[pid].orderCount += 1;
        }
      }
    }

    const productSummary = Object.values(productMap);

    return res.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          name: vendor.name,
          contact: vendor.contact,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          gstNumber: vendor.gstNumber,
          companyRegNo: vendor.companyRegNo,
          products: vendor.products,
        },
        stats: {
          totalOrders,
          activeOrders,
          cancelledOrders,
          totalAmount: totalAmount.toFixed(2),
          totalReceivedAmount: totalReceivedAmount.toFixed(2),
          totalProducts: vendor.products.length,
        },
        productSummary,
        orders,
      },
    });
  } catch (error) {
    console.error('Get vendor history error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch vendor history.' });
  }
};

/**
 * GET /api/vendors
 */
const getAll = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: { products: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Get vendors error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch vendors.' });
  }
};

/**
 * GET /api/vendors/:id
 */
const getById = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { products: true, purchaseOrders: true },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }

    return res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch vendor.' });
  }
};

/**
 * POST /api/vendors
 */
const create = async (req, res) => {
  try {
    const { name, contact, email, companyRegNo, gstNumber, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Company name is required.' });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        contact: contact || null,
        email: email || null,
        companyRegNo: companyRegNo || null,
        gstNumber: gstNumber || null,
        phone: phone || null,
        address: address || null,
      },
    });

    return res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    console.error('Create vendor error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create vendor.' });
  }
};

/**
 * PUT /api/vendors/:id
 */
const update = async (req, res) => {
  try {
    const { name, contact, email, companyRegNo, gstNumber, phone, address } = req.body;

    const vendor = await prisma.vendor.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        contact: contact || null,
        email: email || null,
        companyRegNo: companyRegNo || null,
        gstNumber: gstNumber || null,
        phone: phone || null,
        address: address || null,
      },
    });

    return res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Update vendor error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }
    return res.status(500).json({ success: false, error: 'Failed to update vendor.' });
  }
};

/**
 * DELETE /api/vendors/:id
 */
const deleteVendor = async (req, res) => {
  try {
    // Check if vendor has active purchase orders
    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { purchaseOrders: { where: { status: { not: 'CANCELLED' } } } },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }

    if (vendor.purchaseOrders.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete vendor with ${vendor.purchaseOrders.length} active purchase order(s). Cancel orders first.`,
      });
    }

    await prisma.vendor.delete({
      where: { id: parseInt(req.params.id) },
    });

    return res.json({ success: true, data: { message: 'Vendor deleted successfully.' } });
  } catch (error) {
    console.error('Delete vendor error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }
    return res.status(500).json({ success: false, error: 'Failed to delete vendor.' });
  }
};

module.exports = { getAll, getById, getHistory, create, update, delete: deleteVendor };
