const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const productController = require('../controllers/productController');

// All routes require authentication
router.use(authenticate);

// GET /api/products — all authenticated users
router.get('/', productController.getAll);

// GET /api/products/:id — all authenticated users
router.get('/:id', productController.getById);

// POST /api/products — ADMIN, PRODUCT_MANAGER, or PURCHASE_USER
router.post('/', authorize('ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER'), productController.create);

// PUT /api/products/:id — ADMIN, PRODUCT_MANAGER, or PURCHASE_USER
router.put('/:id', authorize('ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER'), productController.update);

// DELETE /api/products/:id — ADMIN, PRODUCT_MANAGER, or PURCHASE_USER
router.delete('/:id', authorize('ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER'), productController.delete);

module.exports = router;
