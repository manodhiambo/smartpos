const { queryMain } = require('../config/database');

class SubscriptionService {
  /**
   * Get all active subscription plans
   */
  async getPlans() {
    const result = await queryMain(
      'SELECT * FROM public.subscription_plans WHERE is_active = true ORDER BY COALESCE(setup_fee, 0) ASC'
    );
    return result.rows;
  }

  /**
   * Get plan by name
   */
  async getPlanByName(planName) {
    const result = await queryMain(
      'SELECT * FROM public.subscription_plans WHERE plan_name = $1',
      [planName]
    );
    return result.rows[0];
  }

  /**
   * Check if tenant subscription is active
   */
  async isSubscriptionActive(tenantId) {
    const result = await queryMain(
      `SELECT
        subscription_status,
        subscription_plan,
        is_trial,
        trial_ends_at,
        subscription_ends_at,
        grace_period_days,
        CASE
          WHEN is_trial = true THEN trial_ends_at
          ELSE subscription_ends_at
        END as effective_end_date
      FROM public.tenants
      WHERE id = $1`,
      [tenantId]
    );

    const tenant = result.rows[0];
    if (!tenant) return false;

    const now = new Date();
    const endDate = new Date(tenant.effective_end_date);
    const gracePeriodEnd = new Date(endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (tenant.grace_period_days || 3));

    if (tenant.subscription_status === 'active' && now <= gracePeriodEnd) {
      return true;
    }

    // Auto-suspend if expired
    if (now > gracePeriodEnd && tenant.subscription_status === 'active') {
      await this.suspendTenant(tenantId, 'Payment overdue');
      return false;
    }

    return tenant.subscription_status === 'active';
  }

  /**
   * Start 5-day trial for new tenant
   */
  async startTrial(tenantId) {
    const trialDays = 5;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    await queryMain(
      `UPDATE public.tenants
      SET
        subscription_plan = 'trial',
        subscription_status = 'active',
        is_trial = true,
        setup_fee_paid = false,
        trial_ends_at = $1,
        subscription_started_at = NOW()
      WHERE id = $2`,
      [trialEndsAt, tenantId]
    );

    await this.logSubscriptionHistory(
      tenantId,
      'trial_started',
      null,
      'trial',
      'New tenant 5-day trial started'
    );
  }

  /**
   * Activate subscription after setup fee payment (1 year from today)
   */
  async activateAfterSetup(tenantId) {
    const plan = await this.getPlanByName('standard');
    if (!plan) throw new Error('Standard plan not found');

    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);

    const result = await queryMain(
      `UPDATE public.tenants
      SET
        subscription_plan = 'standard',
        subscription_status = 'active',
        is_trial = false,
        setup_fee_paid = true,
        yearly_price = $1,
        subscription_ends_at = $2,
        subscription_started_at = COALESCE(subscription_started_at, NOW()),
        updated_at = NOW()
      WHERE id = $3
      RETURNING subscription_plan`,
      [plan.price_yearly, subscriptionEndsAt, tenantId]
    );

    await this.logSubscriptionHistory(
      tenantId,
      'setup_fee_paid',
      'trial',
      'standard',
      'Subscription activated after setup fee payment — valid for 1 year'
    );

    return result.rows[0];
  }

  /**
   * Renew subscription for 1 year from current end date (or today if expired)
   */
  async renewSubscription(tenantId) {
    const tenant = await queryMain(
      'SELECT subscription_plan, subscription_ends_at FROM public.tenants WHERE id = $1',
      [tenantId]
    );

    const row = tenant.rows[0];
    const baseDate = row.subscription_ends_at && new Date(row.subscription_ends_at) > new Date()
      ? new Date(row.subscription_ends_at)
      : new Date();

    const newEndDate = new Date(baseDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    await queryMain(
      `UPDATE public.tenants
      SET
        subscription_ends_at = $1,
        subscription_status = 'active',
        updated_at = NOW()
      WHERE id = $2`,
      [newEndDate, tenantId]
    );

    await this.logSubscriptionHistory(
      tenantId,
      'subscription_renewed',
      row.subscription_plan,
      row.subscription_plan,
      'Renewed for 1 year'
    );
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId, reason) {
    await queryMain(
      `UPDATE public.tenants
      SET subscription_status = 'suspended', updated_at = NOW()
      WHERE id = $1`,
      [tenantId]
    );

    try {
      await this.logSubscriptionHistory(
        tenantId,
        'subscription_suspended',
        null,
        null,
        reason
      );
    } catch (logErr) {
      console.warn('Subscription history log failed (non-fatal):', logErr.message);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId, reason) {
    await queryMain(
      `UPDATE public.tenants
      SET
        subscription_status = 'cancelled',
        auto_renew = false,
        updated_at = NOW()
      WHERE id = $1`,
      [tenantId]
    );

    await this.logSubscriptionHistory(
      tenantId,
      'subscription_cancelled',
      null,
      null,
      reason
    );
  }

  /**
   * Log subscription history
   */
  async logSubscriptionHistory(tenantId, action, previousPlan, newPlan, reason, performedBy = 'system') {
    await queryMain(
      `INSERT INTO public.subscription_history
        (tenant_id, action, previous_plan, new_plan, reason, performed_by)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, action, previousPlan, newPlan, reason, performedBy]
    );
  }

  /**
   * Get tenant subscription info
   */
  async getTenantSubscription(tenantId) {
    const result = await queryMain(
      `SELECT
        t.*,
        sp.display_name,
        sp.setup_fee,
        sp.price_yearly,
        sp.features,
        sp.max_users,
        sp.max_products,
        sp.max_transactions_per_month,
        CASE
          WHEN t.is_trial = true THEN t.trial_ends_at
          ELSE t.subscription_ends_at
        END as expires_at,
        CASE
          WHEN t.is_trial = true THEN
            EXTRACT(DAY FROM (t.trial_ends_at - NOW()))
          ELSE
            EXTRACT(DAY FROM (t.subscription_ends_at - NOW()))
        END as days_remaining
      FROM public.tenants t
      LEFT JOIN public.subscription_plans sp ON t.subscription_plan = sp.plan_name
      WHERE t.id = $1`,
      [tenantId]
    );

    return result.rows[0];
  }
}

module.exports = new SubscriptionService();
