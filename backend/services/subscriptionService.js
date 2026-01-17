const { queryMain } = require('../config/database');

class SubscriptionService {
  /**
   * Get all subscription plans
   */
  async getPlans() {
    const result = await queryMain(
      'SELECT * FROM public.subscription_plans WHERE is_active = true ORDER BY price_monthly ASC'
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

    // Check if subscription is active and not expired
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
   * Start trial for new tenant
   */
  async startTrial(tenantId) {
    const trialDays = 30;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    await queryMain(
      `UPDATE public.tenants 
      SET 
        subscription_plan = 'trial',
        subscription_status = 'active',
        is_trial = true,
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
      'New tenant trial started'
    );
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(tenantId, planName, months = 1) {
    const plan = await this.getPlanByName(planName);
    if (!plan) throw new Error('Invalid plan');

    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + months);

    const result = await queryMain(
      `UPDATE public.tenants 
      SET 
        subscription_plan = $1,
        subscription_status = 'active',
        is_trial = false,
        subscription_ends_at = $2,
        monthly_price = $3,
        subscription_started_at = COALESCE(subscription_started_at, NOW()),
        updated_at = NOW()
      WHERE id = $4
      RETURNING subscription_plan`,
      [planName, subscriptionEndsAt, plan.price_monthly, tenantId]
    );

    await this.logSubscriptionHistory(
      tenantId,
      'subscription_upgraded',
      'trial',
      planName,
      `Upgraded to ${plan.display_name} for ${months} month(s)`
    );

    return result.rows[0];
  }

  /**
   * Renew subscription
   */
  async renewSubscription(tenantId, months = 1) {
    const tenant = await queryMain(
      'SELECT subscription_plan, subscription_ends_at FROM public.tenants WHERE id = $1',
      [tenantId]
    );

    const currentEndDate = new Date(tenant.rows[0].subscription_ends_at || new Date());
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);

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
      tenant.rows[0].subscription_plan,
      tenant.rows[0].subscription_plan,
      `Renewed for ${months} month(s)`
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

    await this.logSubscriptionHistory(
      tenantId,
      'subscription_suspended',
      null,
      null,
      reason
    );
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
