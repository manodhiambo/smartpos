const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const salesRoutes = require('./salesRoutes');
const purchaseRoutes = require('./purchaseRoutes');
const supplierRoutes = require('./supplierRoutes');
const customerRoutes = require('./customerRoutes');
const expenseRoutes = require('./expenseRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');
const tenantRoutes = require('./tenantRoutes');

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SmartPOS API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/sales', salesRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/expenses', expenseRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/tenant', tenantRoutes);

// API documentation route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SmartPOS API v1.0',
    documentation: {
      auth: '/api/auth',
      products: '/api/products',
      sales: '/api/sales',
      purchases: '/api/purchases',
      suppliers: '/api/suppliers',
      customers: '/api/customers',
      expenses: '/api/expenses',
      dashboard: '/api/dashboard',
      users: '/api/users',
      tenant: '/api/tenant'
    }
  });
});

module.exports = router;
