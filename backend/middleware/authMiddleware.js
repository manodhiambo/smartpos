const jwt = require('jsonwebtoken');
const { queryMain } = require('../config/database');

/**
 * Authenticate user from JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if super admin
    if (decoded.isSuperAdmin) {
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        role: 'super_admin',
        isSuperAdmin: true
      };
      return next();
    }

    // Regular tenant user
    const userResult = await queryMain(
      `SELECT 
        tu.id, tu.username, tu.full_name, tu.email, tu.role, tu.status,
        tu.tenant_id, t.tenant_schema, t.business_name, t.subscription_status
      FROM public.tenant_users tu
      JOIN public.tenants t ON tu.tenant_id = t.id
      WHERE tu.id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSchema: user.tenant_schema,
      businessName: user.business_name,
      subscriptionStatus: user.subscription_status
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Require specific role(s)
 */
exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};
