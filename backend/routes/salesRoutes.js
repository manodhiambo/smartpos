const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateSale } = require('../utils/validators');
const { salesLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Create sale (all authenticated users)
router.post('/', 
  salesLimiter,
  validateSale, 
  salesController.createSale
);

// Get all sales
router.get('/', salesController.getAllSales);

// Get today's summary
router.get('/summary/today', salesController.getTodaySummary);

// Get sales report
router.get('/report', salesController.getSalesReport);

// Get top products
router.get('/top-products', salesController.getTopProducts);

// Get cashier performance
router.get('/cashier-performance', 
  authorize('admin', 'manager'), 
  salesController.getCashierPerformance
);

// Get payment method breakdown
router.get('/payment-methods', salesController.getSalesByPaymentMethod);

// Get sale by receipt number
router.get('/receipt/:receiptNo', salesController.getSaleByReceipt);

// Get sale by ID
router.get('/:id', salesController.getSaleById);

// Void sale (admin, manager only)
router.post('/:id/void', 
  authorize('admin', 'manager'), 
  salesController.voidSale
);

module.exports = router;
