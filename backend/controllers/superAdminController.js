const { queryMain } = require('../config/database');
const subscriptionService = require('../services/subscriptionService');

/**
 * Get all tenants (Super Admin only)
 */
exports.getAllTenants = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, plan } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        t.*,
        sp.display_name as plan_display_name,
        COUNT(p.id) as total_payments,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_revenue
      FROM public.tenants t
      LEFT JOIN public.subscription_plans sp ON t.subscription_plan = sp.plan_name
      LEFT JOIN public.payments p ON t.id = p.tenant_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND t.subscription_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (plan) {
      query += ` AND t.subscription_plan = $${paramCount}`;
      params.push(plan);
      paramCount++;
    }

    query += ` GROUP BY t.id, sp.display_name ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await queryMain(query, params);

    // Get total count
    const countResult = await queryMain(
      'SELECT COUNT(*) FROM public.tenants WHERE 1=1' +
      (status ? ` AND subscription_status = '${status}'` : '') +
      (plan ? ` AND subscription_plan = '${plan}'` : '')
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get all tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenants',
      error: error.message
    });
  }
};

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await queryMain(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_tenants,
        COUNT(CASE WHEN subscription_status = 'suspended' THEN 1 END) as suspended_tenants,
        COUNT(CASE WHEN is_trial = true THEN 1 END) as trial_tenants,
        SUM(CASE WHEN subscription_status = 'active' AND is_trial = false THEN monthly_price ELSE 0 END) as monthly_recurring_revenue
      FROM public.tenants
    `);

    const revenueStats = await queryMain(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'completed' AND payment_date >= NOW() - INTERVAL '30 days' THEN amount ELSE 0 END) as revenue_last_30_days,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
      FROM public.payments
    `);

    const planDistribution = await queryMain(`
      SELECT 
        subscription_plan,
        COUNT(*) as count,
        sp.display_name
      FROM public.tenants t
      LEFT JOIN public.subscription_plans sp ON t.subscription_plan = sp.plan_name
      GROUP BY subscription_plan, sp.display_name
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        tenants: stats.rows[0],
        revenue: revenueStats.rows[0],
        planDistribution: planDistribution.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Suspend tenant
 */
exports.suspendTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    await subscriptionService.suspendTenant(
      tenantId,
      reason || 'Suspended by super admin'
    );

    res.json({
      success: true,
      message: 'Tenant suspended successfully'
    });
  } catch (error) {
    console.error('Suspend tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend tenant',
      error: error.message
    });
  }
};

/**
 * Activate tenant
 */
exports.activateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    await queryMain(
      `UPDATE public.tenants 
      SET subscription_status = 'active', updated_at = NOW()
      WHERE id = $1`,
      [tenantId]
    );

    await subscriptionService.logSubscriptionHistory(
      tenantId,
      'subscription_activated',
      null,
      null,
      'Activated by super admin',
      req.user.username
    );

    res.json({
      success: true,
      message: 'Tenant activated successfully'
    });
  } catch (error) {
    console.error('Activate tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate tenant',
      error: error.message
    });
  }
};

/**
 * Get tenant details
 */
exports.getTenantDetails = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await queryMain(
      `SELECT 
        t.*,
        sp.display_name as plan_display_name,
        sp.features,
        sp.max_users,
        sp.max_products
      FROM public.tenants t
      LEFT JOIN public.subscription_plans sp ON t.subscription_plan = sp.plan_name
      WHERE t.id = $1`,
      [tenantId]
    );

    if (tenant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Get payment history
    const payments = await queryMain(
      `SELECT * FROM public.payments 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10`,
      [tenantId]
    );

    // Get subscription history
    const history = await queryMain(
      `SELECT * FROM public.subscription_history 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        tenant: tenant.rows[0],
        recentPayments: payments.rows,
        subscriptionHistory: history.rows
      }
    });
  } catch (error) {
    console.error('Get tenant details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant details',
      error: error.message
    });
  }
};

/**
 * Get all payments
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*,
        t.business_name,
        t.business_email
      FROM public.payments p
      JOIN public.tenants t ON p.tenant_id = t.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await queryMain(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};
