-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id SERIAL PRIMARY KEY,
  tenant_name VARCHAR(255) NOT NULL,
  tenant_schema VARCHAR(63) NOT NULL UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  business_email VARCHAR(255) NOT NULL UNIQUE,
  business_phone VARCHAR(20),
  business_address TEXT,
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  mpesa_till_number VARCHAR(20),
  mpesa_paybill VARCHAR(20),
  mpesa_account_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tenant_users table
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, username)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_schema ON public.tenants(tenant_schema);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(business_email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_username ON public.tenant_users(username);
