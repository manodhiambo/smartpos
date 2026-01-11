const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create purchase (admin, manager, storekeeper)
router.post('/', 
  authorize('admin', 'manager', 'storekeeper'), 
  purchaseController.createPurchase
);

// Get all purchases
router.get('/', 
  authorize('admin', 'manager', 'storekeeper'), 
  purchaseController.getAllPurchases
);

// Get purchases summary
router.get('/summary', 
  authorize('admin', 'manager'), 
  purchaseController.getPurchasesSummary
);

// Get purchase by ID
router.get('/:id', 
  authorize('admin', 'manager', 'storekeeper'), 
  purchaseController.getPurchaseById
);

// Make payment for purchase
router.post('/:id/payment', 
  authorize('admin', 'manager'), 
  purchaseController.makePayment
);

module.exports = router;
