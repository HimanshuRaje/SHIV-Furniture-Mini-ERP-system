const manufacturingService = require('../services/manufacturingService');

/**
 * GET /api/manufacturing-orders
 */
const getAll = async (req, res) => {
  try {
    const orders = await manufacturingService.getAllManufacturingOrders();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get manufacturing orders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch manufacturing orders.' });
  }
};

/**
 * GET /api/manufacturing-orders/:id
 */
const getById = async (req, res) => {
  try {
    const order = await manufacturingService.getManufacturingOrderById(parseInt(req.params.id));
    if (!order) {
      return res.status(404).json({ success: false, error: 'Manufacturing order not found.' });
    }
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get manufacturing order error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch manufacturing order.' });
  }
};

/**
 * POST /api/manufacturing-orders
 */
const create = async (req, res) => {
  try {
    const order = await manufacturingService.createManufacturingOrder({
      ...req.body,
      createdById: req.user.id,
    });
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create manufacturing order error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create manufacturing order.' });
  }
};

/**
 * PUT /api/manufacturing-orders/:id
 */
const update = async (req, res) => {
  try {
    const order = await manufacturingService.updateManufacturingOrder(parseInt(req.params.id), {
      ...req.body,
      userId: req.user.id,
    });
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Update manufacturing order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update manufacturing order.' });
  }
};

/**
 * DELETE /api/manufacturing-orders/:id
 */
const deleteMO = async (req, res) => {
  try {
    const result = await manufacturingService.deleteManufacturingOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Delete manufacturing order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to delete manufacturing order.' });
  }
};

/**
 * POST /api/manufacturing-orders/:id/confirm
 */
const confirm = async (req, res) => {
  try {
    const result = await manufacturingService.confirmManufacturingOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Confirm manufacturing order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to confirm manufacturing order.' });
  }
};

/**
 * POST /api/manufacturing-orders/:id/cancel
 */
const cancel = async (req, res) => {
  try {
    const result = await manufacturingService.cancelManufacturingOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Cancel manufacturing order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to cancel manufacturing order.' });
  }
};

/**
 * POST /api/manufacturing-orders/:id/start
 */
const start = async (req, res) => {
  try {
    const result = await manufacturingService.startManufacturingOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Start manufacturing order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to start manufacturing order.' });
  }
};

/**
 * POST /api/manufacturing-orders/:id/complete
 */
const complete = async (req, res) => {
  try {
    const result = await manufacturingService.completeManufacturingOrder(parseInt(req.params.id), req.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Complete manufacturing order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to complete manufacturing order.' });
  }
};

/**
 * PUT /api/manufacturing-orders/work-orders/:woId
 */
const updateWorkOrder = async (req, res) => {
  try {
    const result = await manufacturingService.updateWorkOrder(parseInt(req.params.woId), {
      ...req.body,
      userId: req.user.id,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Update work order error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update work order.' });
  }
};

module.exports = { getAll, getById, create, update, delete: deleteMO, confirm, cancel, start, complete, updateWorkOrder };
