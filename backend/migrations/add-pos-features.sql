-- ============================================================
-- POS Features Migration: Shifts, Returns, Stock Adjustments
-- ============================================================
-- These tables are created per-tenant schema.
-- The actual schema-qualified creation is handled in Tenant.js
-- via createTenantSchema() using queryMain with "${tenantSchema}".tablename.
-- This file contains the unqualified DDL that can be applied
-- directly when the PostgreSQL search_path is set to the target
-- tenant schema (e.g., SET search_path TO tenant_schema_name).
-- ============================================================

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  shift_no VARCHAR(30) UNIQUE,
  opened_by INTEGER,
  closed_by INTEGER,
  opening_float DECIMAL(10,2) DEFAULT 0,
  closing_cash DECIMAL(10,2),
  expected_cash DECIMAL(10,2),
  cash_variance DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open',
  notes TEXT,
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

-- Returns table
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  return_no VARCHAR(30) UNIQUE,
  original_sale_id INTEGER,
  original_receipt_no VARCHAR(50),
  processed_by INTEGER,
  customer_id INTEGER,
  reason TEXT NOT NULL,
  refund_method VARCHAR(50) DEFAULT 'cash',
  total_refund DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Return items
CREATE TABLE IF NOT EXISTS return_items (
  id SERIAL PRIMARY KEY,
  return_id INTEGER REFERENCES returns(id) ON DELETE CASCADE,
  product_id INTEGER,
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  restock BOOLEAN DEFAULT true,
  condition VARCHAR(20) DEFAULT 'good',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  product_name VARCHAR(255) NOT NULL,
  adjustment_type VARCHAR(50) NOT NULL,
  quantity_before DECIMAL(10,3) NOT NULL,
  quantity_adjusted DECIMAL(10,3) NOT NULL,
  quantity_after DECIMAL(10,3) NOT NULL,
  cost_impact DECIMAL(10,2) DEFAULT 0,
  reason TEXT,
  adjusted_by INTEGER,
  reference VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
