const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateProduct } = require('../utils/validators');

// All routes require authentication
router.use(authenticate);

// Create product (admin, manager, storekeeper)
router.post('/', 
  authorize('admin', 'manager', 'storekeeper'), 
  validateProduct, 
  productController.createProduct
);

// Get all products
router.get('/', productController.getAllProducts);

// Search products
router.get('/search', productController.searchProducts);

// Get low stock products
router.get('/low-stock', productController.getLowStockProducts);

// Get categories
router.get('/categories', productController.getCategories);

// Get product by barcode
router.get('/barcode/:barcode', productController.getProductByBarcode);

// Get product by ID
router.get('/:id', productController.getProductById);

// Update product (admin, manager, storekeeper)
router.put('/:id', 
  authorize('admin', 'manager', 'storekeeper'), 
  productController.updateProduct
);

// Delete product (admin, manager)
router.delete('/:id', 
  authorize('admin', 'manager'), 
  productController.deleteProduct
);

module.exports = router;
