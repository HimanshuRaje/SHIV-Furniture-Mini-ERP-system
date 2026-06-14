const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const manufacturingController = require('../controllers/manufacturingController');

// All routes require authentication and specific roles
router.use(authenticate);
router.use(authorize('ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER'));

// GET /api/manufacturing-orders
router.get('/', manufacturingController.getAll);

// GET /api/manufacturing-orders/:id
router.get('/:id', manufacturingController.getById);

// POST /api/manufacturing-orders
router.post('/', manufacturingController.create);

// PUT /api/manufacturing-orders/:id
router.put('/:id', manufacturingController.update);

// DELETE /api/manufacturing-orders/:id
router.delete('/:id', manufacturingController.delete);

// POST /api/manufacturing-orders/:id/confirm
router.post('/:id/confirm', manufacturingController.confirm);

// POST /api/manufacturing-orders/:id/start
router.post('/:id/start', manufacturingController.start);

// POST /api/manufacturing-orders/:id/complete
router.post('/:id/complete', manufacturingController.complete);

// POST /api/manufacturing-orders/:id/cancel
router.post('/:id/cancel', manufacturingController.cancel);

// PUT /api/manufacturing-orders/work-orders/:woId
router.put('/work-orders/:woId', manufacturingController.updateWorkOrder);

module.exports = router;
