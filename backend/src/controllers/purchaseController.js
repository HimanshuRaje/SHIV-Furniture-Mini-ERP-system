const purchaseService = require('../services/purchaseService');

/**
 * GET /api/purchase-orders
 */
const getAll = async (req, res) => {
  try {
    const orders = await purchaseService.getAllPurchaseOrders();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch purchase orders.' });
  }
};

/**
 * GET /api/purchase-orders/:id
 */
const getById = async (req, res) => {
  try {
    const order = await purchaseService.getPurchaseOrderById(parseInt(req.params.id));
    if (!order) {
      return res.status(404).json({ success: false, error: 'Purchase order not found.' });
    }
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get purchase order error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch purchase order.' });
  }
};

/**
 * POST /api/purchase-orders
 */
const create = async (req, res) => {
  try {
    const { vendorId, lines, status } = req.body;

    if (!vendorId || !lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vendor ID and at least one line item are required.',
      });
    }

    const order = await purchaseService.createPurchaseOrder({
      vendorId,
      lines,
      status,
      createdById: req.user.id,
    });

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create purchase order error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create purchase order.' });
  }
};

/**
 * PUT /api/purchase-orders/:id
 */
const update = async (req, res) => {
  try {
    const order = await purchaseService.updatePurchaseOrder(parseInt(req.params.id), {
      ...req.body,
      userId: req.user.id,
    });
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Update purchase order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update purchase order.' });
  }
};

/**
 * DELETE /api/purchase-orders/:id
 */
const deletePO = async (req, res) => {
  try {
    const result = await purchaseService.deletePurchaseOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to delete purchase order.' });
  }
};

/**
 * POST /api/purchase-orders/:id/cancel
 */
const cancel = async (req, res) => {
  try {
    const order = await purchaseService.cancelPurchaseOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Cancel purchase order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to cancel purchase order.' });
  }
};

/**
 * POST /api/purchase-orders/:id/confirm
 */
const confirm = async (req, res) => {
  try {
    const order = await purchaseService.confirmPurchaseOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Confirm purchase order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to confirm purchase order.' });
  }
};

/**
 * POST /api/purchase-orders/:id/receive
 */
const receive = async (req, res) => {
  try {
    const { lines } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Receive lines are required.',
      });
    }

    const order = await purchaseService.receivePurchaseOrder(parseInt(req.params.id), lines, req.user.id);
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Receive purchase order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to receive purchase order.' });
  }
};

module.exports = { getAll, getById, create, update, delete: deletePO, cancel, confirm, receive };
