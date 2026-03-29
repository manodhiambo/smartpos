-- Create tenants table (fresh install uses UUID)
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

-- Add any missing columns to existing tenants table
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

-- Drop NOT NULL on all legacy school-specific columns so they do not block business inserts
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['school_name', 'school_code', 'school_type', 'school_level', 'county', 'district'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tenants'
        AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE 'ALTER TABLE public.tenants ALTER COLUMN ' || quote_ident(col) || ' DROP NOT NULL';
    END IF;
  END LOOP;
END $$;

-- Create tenant_users table with UUID tenant_id to match tenants.id
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

-- Fix tenant_users.tenant_id if it exists as INTEGER instead of UUID
DO $$
DECLARE
  v_constraint text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_users'
      AND column_name = 'tenant_id' AND data_type = 'integer'
  ) THEN
    -- Drop any FK constraint referencing tenants
    FOR v_constraint IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.tenant_users'::regclass AND contype = 'f'
    LOOP
      EXECUTE 'ALTER TABLE public.tenant_users DROP CONSTRAINT IF EXISTS ' || quote_ident(v_constraint);
    END LOOP;

    -- Drop the UNIQUE constraint that includes tenant_id (cannot alter column with unique constraint)
    FOR v_constraint IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.tenant_users'::regclass AND contype = 'u'
    LOOP
      EXECUTE 'ALTER TABLE public.tenant_users DROP CONSTRAINT IF EXISTS ' || quote_ident(v_constraint);
    END LOOP;

    -- Truncate existing rows (they used integer tenant IDs that no longer map to UUID tenants)
    TRUNCATE public.tenant_users;

    -- Change column type to UUID
    ALTER TABLE public.tenant_users ALTER COLUMN tenant_id TYPE UUID USING NULL;

    -- Restore FK and unique constraints
    ALTER TABLE public.tenant_users
      ADD CONSTRAINT tenant_users_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.tenant_users
      ADD CONSTRAINT tenant_users_tenant_id_username_key
      UNIQUE (tenant_id, username);
  END IF;
END $$;

-- Add any missing columns to existing tenant_users table
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
