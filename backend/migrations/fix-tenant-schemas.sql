-- This migration patches per-tenant schema tables to match what the models expect.
-- It runs dynamically over every tenant schema found in public.tenants.
-- All statements use ADD COLUMN IF NOT EXISTS so they are safe to re-run.

DO $$
DECLARE
  t RECORD;
  schema_exists BOOLEAN;
BEGIN
  FOR t IN SELECT id, tenant_schema FROM public.tenants WHERE tenant_schema IS NOT NULL LOOP
    -- Check the schema actually exists in pg_namespace
    SELECT EXISTS (
      SELECT 1 FROM pg_namespace WHERE nspname = t.tenant_schema
    ) INTO schema_exists;

    IF NOT schema_exists THEN
      CONTINUE;
    END IF;

    -- ── products ──────────────────────────────────────────────────────────────
    -- Add modern columns if missing (old schema used buying_price, sku, etc.)
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100)', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS vat_type VARCHAR(20) DEFAULT ''vat_inclusive''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT ''pcs''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS expiry_tracking BOOLEAN DEFAULT false', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT ''active''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', t.tenant_schema);
    -- Back-fill status from is_active if that column exists
    EXECUTE format(
      'UPDATE %I.products SET status = CASE WHEN is_active THEN ''active'' ELSE ''inactive'' END WHERE status IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = %L AND table_name = ''products'' AND column_name = ''is_active'')',
      t.tenant_schema, t.tenant_schema
    );

    -- ── customers ─────────────────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.customers ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT ''active''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', t.tenant_schema);

    -- ── suppliers ─────────────────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT ''cash''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.suppliers ADD COLUMN IF NOT EXISTS tax_pin VARCHAR(50)', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.suppliers ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT ''active''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', t.tenant_schema);

    -- ── sales ─────────────────────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.sales ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(50)', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.sales ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.sales ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.sales ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.sales ADD COLUMN IF NOT EXISTS mpesa_code VARCHAR(100)', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.sales ADD COLUMN IF NOT EXISTS notes TEXT', t.tenant_schema);
    -- Back-fill total_amount from total if needed
    EXECUTE format(
      'UPDATE %I.sales SET total_amount = total WHERE total_amount = 0 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = %L AND table_name = ''sales'' AND column_name = ''total'')',
      t.tenant_schema, t.tenant_schema
    );

    -- ── sale_items ────────────────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.sale_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.sale_items ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0', t.tenant_schema);

    -- ── sale_payments (split payment support) ────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.sale_payments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES %I.sales(id) ON DELETE CASCADE,
        method VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reference VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )', t.tenant_schema, t.tenant_schema);

    -- ── purchases ─────────────────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS user_id INTEGER', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100)', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT ''cash''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', t.tenant_schema);
    -- Back-fill total_cost from total if needed
    EXECUTE format(
      'UPDATE %I.purchases SET total_cost = total WHERE total_cost = 0 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = %L AND table_name = ''purchases'' AND column_name = ''total'')',
      t.tenant_schema, t.tenant_schema
    );

    -- ── purchase_items ────────────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.purchase_items ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0', t.tenant_schema);

    -- ── expenses ──────────────────────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT ''cash''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.expenses ADD COLUMN IF NOT EXISTS reference VARCHAR(100)', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.expenses ADD COLUMN IF NOT EXISTS user_id INTEGER', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.expenses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT ''approved''', t.tenant_schema);
    EXECUTE format('ALTER TABLE %I.expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', t.tenant_schema);

    -- ── users VIEW ────────────────────────────────────────────────────────────
    -- Allows models to JOIN users on cashier_id/user_id against public.tenant_users
    EXECUTE format(
      'CREATE OR REPLACE VIEW %I.users AS SELECT id, username, full_name, email, role, status, last_login, created_at, updated_at FROM public.tenant_users WHERE tenant_id = %L::uuid',
      t.tenant_schema, t.id
    );

    RAISE NOTICE 'Patched tenant schema: %', t.tenant_schema;
  END LOOP;
END $$;
