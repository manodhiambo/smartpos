-- Update tenants table with subscription fields
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 3;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id SERIAL PRIMARY KEY,
  plan_name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  max_users INTEGER DEFAULT 5,
  max_products INTEGER DEFAULT 1000,
  max_transactions_per_month INTEGER DEFAULT 10000,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'mpesa',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KES',
  
  -- M-Pesa specific fields
  mpesa_phone VARCHAR(20),
  mpesa_transaction_id VARCHAR(100),
  mpesa_checkout_request_id VARCHAR(100),
  mpesa_merchant_request_id VARCHAR(100),
  mpesa_result_code VARCHAR(10),
  mpesa_result_desc TEXT,
  
  -- Payment status
  status VARCHAR(50) DEFAULT 'pending',
  payment_for VARCHAR(50) DEFAULT 'subscription',
  subscription_period VARCHAR(20),
  subscription_months INTEGER DEFAULT 1,
  
  -- Metadata
  metadata JSONB,
  payment_date TIMESTAMP,
  verified_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subscription_history table
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_name VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  previous_plan VARCHAR(50),
  new_plan VARCHAR(50),
  reason TEXT,
  performed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_name, display_name, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, features)
VALUES 
  ('trial', 'Free Trial', 0, 0, 2, 100, 500, 
   '{"support": "email", "reports": "basic", "multi_location": false}'),
  
  ('basic', 'Basic Plan', 2000, 20000, 5, 1000, 5000, 
   '{"support": "email", "reports": "standard", "multi_location": false, "pos_terminals": 2}'),
  
  ('premium', 'Premium Plan', 5000, 50000, 15, 10000, 50000, 
   '{"support": "email_phone", "reports": "advanced", "multi_location": true, "pos_terminals": 5, "api_access": true}'),
  
  ('enterprise', 'Enterprise Plan', 15000, 150000, 999, 999999, 999999, 
   '{"support": "24_7", "reports": "custom", "multi_location": true, "pos_terminals": 999, "api_access": true, "custom_features": true}')
ON CONFLICT (plan_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_transaction ON public.payments(mpesa_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_tenant ON public.subscription_history(tenant_id);

-- Set trial end dates for existing tenants (30 days from creation)
UPDATE public.tenants 
SET 
  trial_ends_at = created_at + INTERVAL '30 days',
  is_trial = true,
  subscription_plan = 'trial'
WHERE trial_ends_at IS NULL;
