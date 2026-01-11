const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { 
  validateTenantRegistration, 
  validateLogin 
} = require('../utils/validators');
const { authLimiter, registrationLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', registrationLimiter, validateTenantRegistration, authController.registerTenant);
router.post('/login', authLimiter, validateLogin, authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
