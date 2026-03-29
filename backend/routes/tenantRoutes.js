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

// Update receipt settings (admin only)
router.put('/receipt-settings',
  authorize('admin'),
  tenantController.updateReceiptSettings
);

// Update M-Pesa payment settings (admin only)
router.put('/mpesa-settings',
  authorize('admin'),
  tenantController.updateMpesaSettings
);

// Update Daraja API credentials (admin only)
router.put('/daraja-settings',
  authorize('admin'),
  tenantController.updateDarajaSettings
);

// Test Daraja API connection
router.post('/daraja-test',
  authorize('admin'),
  tenantController.testDarajaConnection
);

module.exports = router;
