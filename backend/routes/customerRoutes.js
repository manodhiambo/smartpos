const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create customer
router.post('/', customerController.createCustomer);

// Get all customers
router.get('/', customerController.getAllCustomers);

// Search customers
router.get('/search', customerController.searchCustomers);

// Get customer by ID
router.get('/:id', customerController.getCustomerById);

// Get customer purchase history
router.get('/:id/purchases', customerController.getCustomerPurchaseHistory);

// Update customer
router.put('/:id', customerController.updateCustomer);

// Delete customer
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
