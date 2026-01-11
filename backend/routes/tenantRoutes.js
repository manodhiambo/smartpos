const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get tenant information
router.get('/info', tenantController.getTenantInfo);

// Update tenant information (admin only)
router.put('/info', 
  authorize('admin'), 
  tenantController.updateTenantInfo
);

// Update M-Pesa settings (admin only)
router.put('/mpesa-settings', 
  authorize('admin'), 
  tenantController.updateMpesaSettings
);

module.exports = router;
