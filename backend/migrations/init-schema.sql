-- Add any missing columns to existing tenants table first
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS business_email VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS business_phone VARCHAR(20);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_schema VARCHAR(63);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'trial';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mpesa_till_number VARCHAR(20);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mpesa_paybill VARCHAR(20);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS mpesa_account_number VARCHAR(50);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Drop NOT NULL on ALL legacy columns that are not relevant to a POS business
-- This covers school management system columns and any other legacy NOT NULL fields
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'school_name', 'school_code', 'school_type', 'school_level',
    'county', 'district', 'email', 'phone', 'address', 'name',
    'code', 'type', 'level', 'logo', 'website',
    'contact_person', 'contact_email', 'contact_phone',
    'registration_number', 'license_number'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tenants'
        AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE 'ALTER TABLE public.tenants ALTER COLUMN ' || quote_ident(col) || ' DROP NOT NULL';
      RAISE NOTICE 'Dropped NOT NULL on tenants.%', col;
    END IF;
  END LOOP;
END $$;

-- Create tenants table for fresh installs (UUID primary key)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name VARCHAR(255),
  tenant_schema VARCHAR(63),
  business_name VARCHAR(255),
  business_email VARCHAR(255),
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

-- Fix tenant_users: if tenant_id is INTEGER instead of UUID, drop and recreate the table
-- Using DROP TABLE CASCADE removes all FK constraints from other tables pointing here
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_users'
      AND column_name = 'tenant_id' AND data_type = 'integer'
  ) THEN
    -- CASCADE drops FK constraints in other tables that reference tenant_users
    DROP TABLE IF EXISTS public.tenant_users CASCADE;
    RAISE NOTICE 'Dropped tenant_users (had INTEGER tenant_id) — recreating with UUID';

    CREATE TABLE public.tenant_users (
      id SERIAL PRIMARY KEY,
      tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
      username VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255),
      full_name VARCHAR(255),
      email VARCHAR(255),
      role VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, username)
    );
    RAISE NOTICE 'Recreated tenant_users with UUID tenant_id';
  END IF;
END $$;

-- Create tenant_users if it doesn't exist yet (fresh install)
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, username)
);

-- Add any missing columns to tenant_users
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_schema ON public.tenants(tenant_schema);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_username ON public.tenant_users(username);
