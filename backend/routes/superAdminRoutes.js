const express = require('express');
const router = express.Router();

// Check if super admin controller exists
let superAdminController;
try {
  superAdminController = require('../controllers/superAdminController');
} catch (error) {
  console.warn('⚠️  Super admin controller not found');
  superAdminController = {
    getDashboardStats: (req, res) => res.json({ success: true, data: {} }),
    getAllTenants: (req, res) => res.json({ success: true, data: [] }),
    getTenantDetails: (req, res) => res.json({ success: true, data: {} }),
    suspendTenant: (req, res) => res.json({ success: true }),
    activateTenant: (req, res) => res.json({ success: true }),
    getAllPayments: (req, res) => res.json({ success: true, data: [] })
  };
}

const { authenticate, requireRole } = require('../middleware/authMiddleware');

// All routes require super admin authentication
router.use(authenticate);
router.use(requireRole('super_admin'));

// Dashboard stats
router.get('/stats', superAdminController.getDashboardStats);

// Tenants management
router.get('/tenants', superAdminController.getAllTenants);
router.get('/tenants/:tenantId', superAdminController.getTenantDetails);
router.post('/tenants/:tenantId/suspend', superAdminController.suspendTenant);
router.post('/tenants/:tenantId/activate', superAdminController.activateTenant);

// Payments
router.get('/payments', superAdminController.getAllPayments);

module.exports = router;
