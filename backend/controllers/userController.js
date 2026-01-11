const User = require('../models/User');

/**
 * Create new user (staff member)
 */
exports.createUser = async (req, res, next) => {
  try {
    const { tenantSchema, tenantId, role: creatorRole } = req.user;

    // Only admin and manager can create users
    if (creatorRole !== 'admin' && creatorRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create users'
      });
    }

    const { username, password, fullName, email, role } = req.body;

    // Check if username already exists
    const usernameExists = await User.usernameExists(username, tenantId);
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const userData = {
      tenantId,
      username,
      password,
      fullName,
      email,
      role
    };

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    next(error);
  }
};

/**
 * Get all users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const result = await User.findByTenant(
      tenantId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get users error:', error);
    next(error);
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    next(error);
  }
};

/**
 * Update user
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { role: creatorRole, tenantId } = req.user;
    const { id } = req.params;

    // Only admin and manager can update users
    if (creatorRole !== 'admin' && creatorRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update users'
      });
    }

    // Check if username is being changed and if it already exists
    if (req.body.username) {
      const usernameExists = await User.usernameExists(req.body.username, tenantId, id);
      if (usernameExists) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    const user = await User.update(id, req.body);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    next(error);
  }
};

/**
 * Delete user (deactivate)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { role: creatorRole, id: creatorId } = req.user;
    const { id } = req.params;

    // Only admin can delete users
    if (creatorRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete users'
      });
    }

    // Cannot delete self
    if (parseInt(id) === creatorId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.delete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    next(error);
  }
};

/**
 * Reset user password (admin only)
 */
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { role: creatorRole } = req.user;
    const { id } = req.params;
    const { newPassword } = req.body;

    // Only admin can reset passwords
    if (creatorRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reset passwords'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const user = await User.update(id, { password: newPassword });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    next(error);
  }
};

module.exports = exports;
