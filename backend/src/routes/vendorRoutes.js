const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const vendorController = require('../controllers/vendorController');

// All routes require authentication
router.use(authenticate);

// GET /api/vendors – any authenticated user can view
router.get('/', vendorController.getAll);

// GET /api/vendors/:id/history
router.get('/:id/history', vendorController.getHistory);

// GET /api/vendors/:id
router.get('/:id', vendorController.getById);

// POST /api/vendors – purchase managers and admins can create
router.post('/', authorize('ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'), vendorController.create);

// PUT /api/vendors/:id – purchase managers and admins can update
router.put('/:id', authorize('ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'), vendorController.update);

// DELETE /api/vendors/:id – purchase managers and admins can delete
router.delete('/:id', authorize('ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'), vendorController.delete);

module.exports = router;
