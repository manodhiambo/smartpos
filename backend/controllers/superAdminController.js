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

// ============================================
// SUBSCRIPTION PLANS MANAGEMENT (NEW)
// ============================================

/**
 * Get all subscription plans
 */
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await queryMain(`
      SELECT
        sp.*,
        COUNT(t.id) as active_subscribers
      FROM public.subscription_plans sp
      LEFT JOIN public.tenants t ON sp.plan_name = t.subscription_plan AND t.subscription_status = 'active'
      GROUP BY sp.id
      ORDER BY sp.price_monthly ASC
    `);

    res.json({
      success: true,
      data: plans.rows
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error.message
    });
  }
};

/**
 * Create new subscription plan
 */
exports.createPlan = async (req, res) => {
  try {
    const {
      plan_name,
      display_name,
      price_monthly,
      price_yearly,
      max_users,
      max_products,
      max_transactions_per_month,
      features
    } = req.body;

    const result = await queryMain(`
      INSERT INTO public.subscription_plans (
        plan_name, display_name, price_monthly, price_yearly,
        max_users, max_products, max_transactions_per_month,
        features, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [
      plan_name,
      display_name,
      price_monthly,
      price_yearly,
      max_users,
      max_products,
      max_transactions_per_month,
      JSON.stringify(features)
    ]);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message
    });
  }
};

/**
 * Update subscription plan
 */
exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const {
      display_name,
      price_monthly,
      price_yearly,
      max_users,
      max_products,
      max_transactions_per_month,
      features,
      is_active
    } = req.body;

    const result = await queryMain(`
      UPDATE public.subscription_plans
      SET
        display_name = COALESCE($1, display_name),
        price_monthly = COALESCE($2, price_monthly),
        price_yearly = COALESCE($3, price_yearly),
        max_users = COALESCE($4, max_users),
        max_products = COALESCE($5, max_products),
        max_transactions_per_month = COALESCE($6, max_transactions_per_month),
        features = COALESCE($7, features),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      display_name,
      price_monthly,
      price_yearly,
      max_users,
      max_products,
      max_transactions_per_month,
      features ? JSON.stringify(features) : null,
      is_active,
      planId
    ]);

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: error.message
    });
  }
};

/**
 * Assign plan to tenant
 */
exports.assignPlan = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan_name, months } = req.body;

    // Get plan details
    const plan = await queryMain(
      'SELECT * FROM public.subscription_plans WHERE plan_name = $1',
      [plan_name]
    );

    if (plan.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const planData = plan.rows[0];
    const monthsCount = parseInt(months) || 1;
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + monthsCount);

    // Update tenant
    await queryMain(`
      UPDATE public.tenants
      SET
        subscription_plan = $1,
        subscription_status = 'active',
        subscription_started_at = NOW(),
        subscription_ends_at = $2,
        monthly_price = $3,
        is_trial = false,
        trial_ends_at = NULL,
        updated_at = NOW()
      WHERE id = $4
    `, [plan_name, subscriptionEndsAt, planData.price_monthly, tenantId]);

    // Log subscription history
    await subscriptionService.logSubscriptionHistory(
      tenantId,
      'plan_assigned',
      null,
      plan_name,
      `Plan assigned by super admin for ${monthsCount} month(s)`,
      req.user.username
    );

    res.json({
      success: true,
      message: `Plan assigned successfully for ${monthsCount} month(s)`
    });
  } catch (error) {
    console.error('Assign plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign plan',
      error: error.message
    });
  }
};

/**
 * Extend trial period
 */
exports.extendTrial = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { days } = req.body;

    const daysToAdd = parseInt(days) || 30;
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + daysToAdd);

    await queryMain(`
      UPDATE public.tenants
      SET
        trial_ends_at = $1,
        is_trial = true,
        subscription_status = 'active',
        updated_at = NOW()
      WHERE id = $2
    `, [newTrialEnd, tenantId]);

    await subscriptionService.logSubscriptionHistory(
      tenantId,
      'trial_extended',
      null,
      null,
      `Trial extended by ${daysToAdd} days by super admin`,
      req.user.username
    );

    res.json({
      success: true,
      message: `Trial extended by ${daysToAdd} days`
    });
  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend trial',
      error: error.message
    });
  }
};

/**
 * Record manual payment
 */
exports.recordPayment = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      amount,
      payment_method,
      reference,
      notes,
      months
    } = req.body;

    // Get tenant's current plan
    const tenant = await queryMain(
      'SELECT * FROM public.tenants WHERE id = $1',
      [tenantId]
    );

    if (tenant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenantData = tenant.rows[0];

    // Record payment
    const payment = await queryMain(`
      INSERT INTO public.payments (
        tenant_id,
        payment_method,
        amount,
        currency,
        status,
        payment_for,
        subscription_months,
        metadata,
        payment_date,
        verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      tenantId,
      payment_method || 'manual',
      amount,
      'KES',
      'completed',
      'subscription',
      months || 1,
      JSON.stringify({ reference, notes, recorded_by: req.user.username })
    ]);

    // Extend subscription if months specified
    if (months && months > 0) {
      const newEndDate = new Date(tenantData.subscription_ends_at || new Date());
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(months));

      await queryMain(`
        UPDATE public.tenants
        SET
          subscription_ends_at = $1,
          subscription_status = 'active',
          updated_at = NOW()
        WHERE id = $2
      `, [newEndDate, tenantId]);
    }

    // Log subscription history
    await subscriptionService.logSubscriptionHistory(
      tenantId,
      'payment_recorded',
      null,
      null,
      `Manual payment of KES ${amount} recorded by super admin`,
      req.user.username
    );

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment.rows[0]
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

/**
 * Delete subscription plan
 */
exports.deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;

    // Check if plan has active subscribers
    const check = await queryMain(
      `SELECT COUNT(*) as count FROM public.tenants
       WHERE subscription_plan = (SELECT plan_name FROM public.subscription_plans WHERE id = $1)
       AND subscription_status = 'active'`,
      [planId]
    );

    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active subscribers. Please migrate them first.'
      });
    }

    // Soft delete - just deactivate
    await queryMain(
      'UPDATE public.subscription_plans SET is_active = false WHERE id = $1',
      [planId]
    );

    res.json({
      success: true,
      message: 'Plan deactivated successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message
    });
  }
};

module.exports = exports;
