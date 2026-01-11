const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUser } = require('../utils/validators');

// All routes require authentication
router.use(authenticate);

// Create user (admin, manager)
router.post('/', 
  authorize('admin', 'manager'), 
  validateUser, 
  userController.createUser
);

// Get all users
router.get('/', 
  authorize('admin', 'manager'), 
  userController.getAllUsers
);

// Get user by ID
router.get('/:id', 
  authorize('admin', 'manager'), 
  userController.getUserById
);

// Update user
router.put('/:id', 
  authorize('admin', 'manager'), 
  userController.updateUser
);

// Reset user password (admin only)
router.post('/:id/reset-password', 
  authorize('admin'), 
  userController.resetUserPassword
);

// Delete user (admin only)
router.delete('/:id', 
  authorize('admin'), 
  userController.deleteUser
);

module.exports = router;
