const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const salesRoutes = require('./salesRoutes'); // Fixed: was saleRoutes
const purchaseRoutes = require('./purchaseRoutes');
const supplierRoutes = require('./supplierRoutes');
const customerRoutes = require('./customerRoutes');
const expenseRoutes = require('./expenseRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');
const tenantRoutes = require('./tenantRoutes');
const paymentRoutes = require('./paymentRoutes');

// Check if subscription middleware exists
let checkSubscription;
try {
  const subMiddleware = require('../middleware/subscriptionMiddleware');
  checkSubscription = subMiddleware.checkSubscription;
} catch (error) {
  console.warn('⚠️  Subscription middleware not found, using passthrough');
  checkSubscription = (req, res, next) => next();
}

// Check if super admin routes exist
let superAdminRoutes;
try {
  superAdminRoutes = require('./superAdminRoutes');
} catch (error) {
  console.warn('⚠️  Super admin routes not found');
  superAdminRoutes = express.Router();
}

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SmartPOS API'
  });
});

// Public routes (no subscription check)
router.use('/auth', authRoutes);
router.use('/payments', paymentRoutes);

// Super admin routes (no subscription check)
router.use('/super-admin', superAdminRoutes);

// Protected routes (with subscription check)
router.use('/products', checkSubscription, productRoutes);
router.use('/sales', checkSubscription, salesRoutes); // Fixed: was saleRoutes
router.use('/purchases', checkSubscription, purchaseRoutes);
router.use('/suppliers', checkSubscription, supplierRoutes);
router.use('/customers', checkSubscription, customerRoutes);
router.use('/expenses', checkSubscription, expenseRoutes);
router.use('/dashboard', checkSubscription, dashboardRoutes);
router.use('/users', checkSubscription, userRoutes);
router.use('/tenant', checkSubscription, tenantRoutes);

module.exports = router;
