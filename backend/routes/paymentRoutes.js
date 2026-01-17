const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');

// Get subscription plans (public)
router.get('/plans', paymentController.getPlans);

// Protected routes
router.use(authenticate);

// Get current subscription info
router.get('/subscription', paymentController.getSubscriptionInfo);

// Initiate payment
router.post('/initiate', paymentController.initiatePayment);

// Check payment status
router.get('/status/:paymentId', paymentController.checkPaymentStatus);

// Get payment history
router.get('/history', paymentController.getPaymentHistory);

// M-Pesa callback (no auth required)
router.post('/mpesa/callback', paymentController.mpesaCallback);

module.exports = router;
