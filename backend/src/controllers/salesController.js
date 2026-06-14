const salesService = require('../services/salesService');

/**
 * GET /api/sales-orders
 */
const getAll = async (req, res) => {
  try {
    const orders = await salesService.getAllSalesOrders();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get sales orders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sales orders.' });
  }
};

/**
 * GET /api/sales-orders/:id
 */
const getById = async (req, res) => {
  try {
    const order = await salesService.getSalesOrderById(parseInt(req.params.id));
    if (!order) {
      return res.status(404).json({ success: false, error: 'Sales order not found.' });
    }
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get sales order error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sales order.' });
  }
};

/**
 * POST /api/sales-orders
 */
const create = async (req, res) => {
  try {
    const { customerName, customerPhone, customerAddress, paymentMethod, paidAmount, notes, lines } = req.body;

    if (!customerName || !lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and at least one line item are required.',
      });
    }

    const order = await salesService.createSalesOrder({
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      paidAmount,
      notes,
      lines,
      createdById: req.user.id,
    });

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create sales order error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create sales order.' });
  }
};

/**
 * PUT /api/sales-orders/:id
 */
const update = async (req, res) => {
  try {
    const order = await salesService.updateSalesOrder(parseInt(req.params.id), {
      ...req.body,
      userId: req.user.id,
    });
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Update sales order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update sales order.' });
  }
};

/**
 * DELETE /api/sales-orders/:id
 */
const deleteSO = async (req, res) => {
  try {
    const result = await salesService.deleteSalesOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Delete sales order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to delete sales order.' });
  }
};

/**
 * POST /api/sales-orders/:id/confirm
 */
const confirm = async (req, res) => {
  try {
    const result = await salesService.confirmSalesOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Confirm sales order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to confirm sales order.' });
  }
};

/**
 * POST /api/sales-orders/:id/deliver
 */
const deliver = async (req, res) => {
  try {
    const { lines } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Delivery lines are required.',
      });
    }

    const order = await salesService.deliverSalesOrder(parseInt(req.params.id), lines, req.user.id);
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Deliver sales order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to deliver sales order.' });
  }
};

/**
 * POST /api/sales-orders/:id/cancel
 */
const cancel = async (req, res) => {
  try {
    const order = await salesService.cancelSalesOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Cancel sales order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to cancel sales order.' });
  }
};

module.exports = { getAll, getById, create, update, delete: deleteSO, confirm, deliver, cancel };
