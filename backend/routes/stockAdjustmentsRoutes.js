const express = require('express');
const router = express.Router();
const stockAdjustmentsController = require('../controllers/stockAdjustmentsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create a stock adjustment (admin or manager only)
router.post('/',
  authorize('admin', 'manager'),
  stockAdjustmentsController.createAdjustment
);

// Get all adjustments (paginated, filterable)
router.get('/', stockAdjustmentsController.getAllAdjustments);

// Get adjustments for a specific product — must come before /:adjustmentId if added later
router.get('/product/:productId', stockAdjustmentsController.getAdjustmentsByProduct);

module.exports = router;
