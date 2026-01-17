let subscriptionService;
try {
  subscriptionService = require('../services/subscriptionService');
} catch (error) {
  console.warn('⚠️  Subscription service not found');
}

/**
 * Check if tenant's subscription is active
 */
exports.checkSubscription = async (req, res, next) => {
  try {
    // Skip for public routes and super admin
    if (!req.user || req.user.isSuperAdmin) {
      return next();
    }

    // If subscription service doesn't exist, allow access
    if (!subscriptionService) {
      return next();
    }

    const tenantId = req.user.tenantId;
    const isActive = await subscriptionService.isSubscriptionActive(tenantId);

    if (!isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue using SmartPOS.',
        code: 'SUBSCRIPTION_EXPIRED',
        action: 'RENEW_SUBSCRIPTION'
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    // Don't block on subscription check errors
    next();
  }
};

/**
 * Check usage limits based on subscription plan
 */
exports.checkUsageLimits = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.isSuperAdmin || !subscriptionService) {
        return next();
      }

      const subscription = await subscriptionService.getTenantSubscription(req.user.tenantId);
      
      // This is a placeholder - you can implement specific limit checks
      // For example: check if user count exceeds max_users
      
      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      next(); // Don't block on limit check errors
    }
  };
};
