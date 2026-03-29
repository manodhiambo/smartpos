-- Add subscription columns to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 3;

-- Create subscription_plans table (fresh install)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50),
  plan_name VARCHAR(50),
  display_name VARCHAR(100),
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  max_users INTEGER DEFAULT 5,
  max_products INTEGER DEFAULT 1000,
  max_transactions_per_month INTEGER DEFAULT 10000,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to subscription_plans (for existing tables with different schema)
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS plan_name VARCHAR(50);
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_products INTEGER DEFAULT 1000;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_transactions_per_month INTEGER DEFAULT 10000;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS features JSONB;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Drop NOT NULL on ALL legacy columns in subscription_plans that block inserts
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'name', 'code', 'label', 'title', 'base_price', 'price',
    'amount', 'description', 'slug', 'type', 'category'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscription_plans'
        AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE 'ALTER TABLE public.subscription_plans ALTER COLUMN ' || quote_ident(col) || ' DROP NOT NULL';
      RAISE NOTICE 'Dropped NOT NULL on subscription_plans.%', col;
    END IF;
  END LOOP;
END $$;

-- Ensure unique constraint on plan_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_plans_plan_name_key'
      AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_plan_name_key UNIQUE (plan_name);
  END IF;
END $$;

-- Fix payments: drop and recreate with UUID tenant_id if currently INTEGER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments'
      AND column_name = 'tenant_id' AND data_type = 'integer'
  ) THEN
    DROP TABLE IF EXISTS public.payments CASCADE;
    RAISE NOTICE 'Dropped payments (had INTEGER tenant_id) — recreating with UUID';

    CREATE TABLE public.payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID,
      payment_method VARCHAR(50) DEFAULT 'mpesa',
      amount DECIMAL(10,2),
      currency VARCHAR(10) DEFAULT 'KES',
      mpesa_phone VARCHAR(20),
      mpesa_transaction_id VARCHAR(100),
      mpesa_checkout_request_id VARCHAR(100),
      mpesa_merchant_request_id VARCHAR(100),
      mpesa_result_code VARCHAR(10),
      mpesa_result_desc TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      payment_for VARCHAR(50) DEFAULT 'subscription',
      subscription_period VARCHAR(20),
      subscription_months INTEGER DEFAULT 1,
      metadata JSONB,
      payment_date TIMESTAMP,
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE 'Recreated payments with UUID tenant_id';
  END IF;
END $$;

-- Create payments table if it does not exist yet
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  payment_method VARCHAR(50) DEFAULT 'mpesa',
  amount DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'KES',
  mpesa_phone VARCHAR(20),
  mpesa_transaction_id VARCHAR(100),
  mpesa_checkout_request_id VARCHAR(100),
  mpesa_merchant_request_id VARCHAR(100),
  mpesa_result_code VARCHAR(10),
  mpesa_result_desc TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  payment_for VARCHAR(50) DEFAULT 'subscription',
  subscription_period VARCHAR(20),
  subscription_months INTEGER DEFAULT 1,
  metadata JSONB,
  payment_date TIMESTAMP,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fix subscription_history: drop and recreate with UUID if currently INTEGER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_history'
      AND column_name = 'tenant_id' AND data_type = 'integer'
  ) THEN
    DROP TABLE IF EXISTS public.subscription_history CASCADE;

    CREATE TABLE public.subscription_history (
      id SERIAL PRIMARY KEY,
      tenant_id UUID,
      plan_name VARCHAR(50),
      action VARCHAR(50),
      previous_plan VARCHAR(50),
      new_plan VARCHAR(50),
      reason TEXT,
      performed_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Create subscription_history table if it does not exist yet
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  plan_name VARCHAR(50),
  action VARCHAR(50),
  previous_plan VARCHAR(50),
  new_plan VARCHAR(50),
  reason TEXT,
  performed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default subscription plans (safe upsert using WHERE NOT EXISTS)
INSERT INTO public.subscription_plans (name, plan_name, display_name, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, features, is_active)
SELECT 'trial', 'trial', 'Free Trial', 0, 0, 2, 100, 500, '{"support": "email", "reports": "basic", "multi_location": false}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE plan_name = 'trial');

INSERT INTO public.subscription_plans (name, plan_name, display_name, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, features, is_active)
SELECT 'basic', 'basic', 'Basic Plan', 1700, 20000, 5, 1000, 5000, '{"support": "email", "reports": "standard", "multi_location": false, "pos_terminals": 2}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE plan_name = 'basic');

INSERT INTO public.subscription_plans (name, plan_name, display_name, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, features, is_active)
SELECT 'premium', 'premium', 'Premium Plan', 5000, 50000, 15, 10000, 50000, '{"support": "email_phone", "reports": "advanced", "multi_location": true, "pos_terminals": 5, "api_access": true}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE plan_name = 'premium');

INSERT INTO public.subscription_plans (name, plan_name, display_name, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, features, is_active)
SELECT 'enterprise', 'enterprise', 'Enterprise Plan', 15000, 150000, 999, 999999, 999999, '{"support": "24_7", "reports": "custom", "multi_location": true, "pos_terminals": 999, "api_access": true, "custom_features": true}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE plan_name = 'enterprise');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_tenant ON public.subscription_history(tenant_id);

-- Set trial end dates for existing tenants missing them
UPDATE public.tenants
SET trial_ends_at = created_at + INTERVAL '5 days', is_trial = true, subscription_plan = 'trial'
WHERE trial_ends_at IS NULL AND created_at IS NOT NULL;
