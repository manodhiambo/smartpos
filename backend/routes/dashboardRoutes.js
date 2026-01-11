const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get dashboard overview
router.get('/overview', dashboardController.getDashboardOverview);

// Get sales analytics
router.get('/sales-analytics', 
  authorize('admin', 'manager'), 
  dashboardController.getSalesAnalytics
);

// Get inventory alerts
router.get('/inventory-alerts', dashboardController.getInventoryAlerts);

// Get financial summary
router.get('/financial-summary', 
  authorize('admin', 'manager'), 
  dashboardController.getFinancialSummary
);

// Get hourly sales trend
router.get('/hourly-sales', dashboardController.getHourlySalesTrend);

module.exports = router;
