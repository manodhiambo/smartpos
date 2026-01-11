const jwt = require('jsonwebtoken');
const { queryMain, queryTenant } = require('../config/database');

/**
 * Verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details from database
    const userResult = await queryMain(
      `SELECT tu.*, t.tenant_schema, t.business_name, t.subscription_status
       FROM public.tenant_users tu
       JOIN public.tenants t ON tu.tenant_id = t.id
       WHERE tu.id = $1 AND tu.status = 'active'`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive.'
      });
    }

    const user = userResult.rows[0];

    // Check tenant subscription status
    if (user.subscription_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please contact support.'
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      tenantId: user.tenant_id,
      tenantSchema: user.tenant_schema,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      businessName: user.business_name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

/**
 * Check if user has required role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }

    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await queryMain(
      `SELECT tu.*, t.tenant_schema, t.business_name
       FROM public.tenant_users tu
       JOIN public.tenants t ON tu.tenant_id = t.id
       WHERE tu.id = $1 AND tu.status = 'active'`,
      [decoded.userId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        tenantId: user.tenant_id,
        tenantSchema: user.tenant_schema,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        businessName: user.business_name
      };
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
