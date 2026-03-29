-- Add subscription columns to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
-- Receipt customization
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS receipt_header TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'Thank you for shopping with us!';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS receipt_tagline VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS receipt_kra_pin VARCHAR(50);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS receipt_show_vat BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS receipt_copies SMALLINT DEFAULT 1;

-- Daraja API credentials for per-tenant M-Pesa STK Push
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mpesa_consumer_key VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mpesa_consumer_secret VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mpesa_passkey VARCHAR(512);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mpesa_environment VARCHAR(20) DEFAULT 'sandbox';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 3;

-- Create subscription_plans table (fresh install)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50),
  plan_name VARCHAR(50),
  display_name VARCHAR(100),
  setup_fee DECIMAL(10,2) DEFAULT 0,
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
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS setup_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_products INTEGER DEFAULT 1000;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_transactions_per_month INTEGER DEFAULT 10000;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS features JSONB;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Drop NOT NULL on EVERY non-system column in subscription_plans except the primary key.
DO $$
DECLARE
  col TEXT;
BEGIN
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
      AND is_nullable = 'NO'
      AND column_name <> 'id'
      AND column_default IS NULL
  LOOP
    EXECUTE 'ALTER TABLE public.subscription_plans ALTER COLUMN ' || quote_ident(col) || ' DROP NOT NULL';
    RAISE NOTICE 'Dropped NOT NULL on subscription_plans.%', col;
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

-- Add missing columns to subscription_history for existing tables
ALTER TABLE public.subscription_history ADD COLUMN IF NOT EXISTS plan_name VARCHAR(50);
ALTER TABLE public.subscription_history ADD COLUMN IF NOT EXISTS action VARCHAR(50);
ALTER TABLE public.subscription_history ADD COLUMN IF NOT EXISTS previous_plan VARCHAR(50);
ALTER TABLE public.subscription_history ADD COLUMN IF NOT EXISTS new_plan VARCHAR(50);
ALTER TABLE public.subscription_history ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.subscription_history ADD COLUMN IF NOT EXISTS performed_by VARCHAR(100);

-- Seed default subscription plans (safe upsert using WHERE NOT EXISTS)
-- Trial plan — free, no setup fee
INSERT INTO public.subscription_plans (name, plan_name, display_name, setup_fee, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, features, is_active)
SELECT 'trial', 'trial', 'Free Trial', 0, 0, 0, 2, 100, 500, '{"support": "email", "reports": "basic", "multi_location": false}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE plan_name = 'trial');

-- Standard plan — one-time setup KSh 70,000 + KSh 20,000/year renewal
INSERT INTO public.subscription_plans (name, plan_name, display_name, setup_fee, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, features, is_active)
SELECT 'standard', 'standard', 'Standard Plan', 70000, 0, 20000, 999, 999999, 999999, '{"support": "email_phone", "reports": "advanced", "multi_location": true, "pos_terminals": 999, "api_access": true}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE plan_name = 'standard');

-- Update existing standard plan pricing if it already exists
UPDATE public.subscription_plans
SET setup_fee = 70000, price_monthly = 0, price_yearly = 20000, display_name = 'Standard Plan', updated_at = NOW()
WHERE plan_name = 'standard';

-- Deactivate old monthly plans (basic/premium/enterprise) — replaced by standard
UPDATE public.subscription_plans SET is_active = false WHERE plan_name IN ('basic', 'premium', 'enterprise');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_tenant ON public.subscription_history(tenant_id);

-- Set trial end dates for existing tenants missing them
UPDATE public.tenants
SET trial_ends_at = created_at + INTERVAL '5 days', is_trial = true, subscription_plan = 'trial'
WHERE trial_ends_at IS NULL AND created_at IS NOT NULL;
