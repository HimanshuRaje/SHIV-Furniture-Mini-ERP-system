const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const purchaseController = require('../controllers/purchaseController');

// All routes require authentication and specific roles
router.use(authenticate);
router.use(authorize('ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'));

// GET /api/purchase-orders
router.get('/', purchaseController.getAll);

// GET /api/purchase-orders/:id
router.get('/:id', purchaseController.getById);

// POST /api/purchase-orders
router.post('/', purchaseController.create);

// PUT /api/purchase-orders/:id
router.put('/:id', purchaseController.update);

// DELETE /api/purchase-orders/:id
router.delete('/:id', purchaseController.delete);

// POST /api/purchase-orders/:id/confirm
router.post('/:id/confirm', purchaseController.confirm);

// POST /api/purchase-orders/:id/cancel
router.post('/:id/cancel', purchaseController.cancel);

// POST /api/purchase-orders/:id/receive
router.post('/:id/receive', purchaseController.receive);

module.exports = router;
