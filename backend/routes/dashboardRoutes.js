const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Get dashboard stats (main endpoint used by frontend)
router.get('/stats', dashboardController.getDashboardOverview);

// Get dashboard overview (alias)
router.get('/overview', dashboardController.getDashboardOverview);

// Get sales analytics
router.get('/sales-analytics', dashboardController.getSalesAnalytics);

// Get inventory alerts
router.get('/inventory-alerts', dashboardController.getInventoryAlerts);

// Get financial summary
router.get('/financial-summary', dashboardController.getFinancialSummary);

// Get hourly sales trend
router.get('/hourly-sales', dashboardController.getHourlySalesTrend);

module.exports = router;
