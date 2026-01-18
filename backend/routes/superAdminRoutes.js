const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
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
router.post('/tenants/:tenantId/assign-plan', superAdminController.assignPlan);
router.post('/tenants/:tenantId/extend-trial', superAdminController.extendTrial);
router.post('/tenants/:tenantId/record-payment', superAdminController.recordPayment);

// Payments
router.get('/payments', superAdminController.getAllPayments);

// Subscription Plans Management
router.get('/plans', superAdminController.getAllPlans);
router.post('/plans', superAdminController.createPlan);
router.put('/plans/:planId', superAdminController.updatePlan);
router.delete('/plans/:planId', superAdminController.deletePlan);

module.exports = router;
