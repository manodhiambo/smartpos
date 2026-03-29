const { queryMain, queryTenant, transactionTenant } = require('../config/database');
const { generateTenantSchema } = require('../utils/helpers');

class Tenant {
  /**
   * Create a new tenant
   */
  static async create(tenantData) {
    const {
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    } = tenantData;

    // Generate unique schema name
    const tenantSchema = generateTenantSchema(businessName);

    // Insert tenant
    const result = await queryMain(
      `INSERT INTO public.tenants (
        tenant_name, tenant_schema, business_name, business_email,
        business_phone, business_address, mpesa_till_number,
        mpesa_paybill, mpesa_account_number, subscription_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        businessName,
        tenantSchema,
        businessName,
        businessEmail,
        businessPhone,
        businessAddress,
        mpesaTillNumber || null,
        mpesaPaybill || null,
        mpesaAccountNumber || null,
        'active'
      ]
    );

    return result.rows[0];
  }

  /**
   * Get tenant by ID
   */
  static async findById(tenantId) {
    const result = await queryMain(
      'SELECT * FROM public.tenants WHERE id = $1',
      [tenantId]
    );
    return result.rows[0];
  }

  /**
   * Get tenant by schema name
   */
  static async findBySchema(tenantSchema) {
    const result = await queryMain(
      'SELECT * FROM public.tenants WHERE tenant_schema = $1',
      [tenantSchema]
    );
    return result.rows[0];
  }

  /**
   * Get tenant by email
   */
  static async findByEmail(businessEmail) {
    const result = await queryMain(
      'SELECT * FROM public.tenants WHERE business_email = $1',
      [businessEmail]
    );
    return result.rows[0];
  }

  /**
   * Update tenant information
   */
  static async update(tenantId, updateData) {
    const {
      businessName,
      businessPhone,
      businessAddress,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    } = updateData;

    const result = await queryMain(
      `UPDATE public.tenants 
       SET business_name = COALESCE($1, business_name),
           business_phone = COALESCE($2, business_phone),
           business_address = COALESCE($3, business_address),
           mpesa_till_number = COALESCE($4, mpesa_till_number),
           mpesa_paybill = COALESCE($5, mpesa_paybill),
           mpesa_account_number = COALESCE($6, mpesa_account_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [businessName, businessPhone, businessAddress, mpesaTillNumber, 
       mpesaPaybill, mpesaAccountNumber, tenantId]
    );

    return result.rows[0];
  }

  /**
   * Update subscription status
   */
  static async updateSubscription(tenantId, status, plan) {
    const result = await queryMain(
      `UPDATE public.tenants 
       SET subscription_status = $1, 
           subscription_plan = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, plan, tenantId]
    );

    return result.rows[0];
  }

  /**
   * Delete tenant (soft delete by deactivating)
   */
  static async delete(tenantId) {
    const result = await queryMain(
      `UPDATE public.tenants 
       SET subscription_status = 'inactive',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [tenantId]
    );

    return result.rows[0];
  }

  /**
   * Get all tenants with pagination
   */
  static async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const result = await queryMain(
      `SELECT * FROM public.tenants 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await queryMain('SELECT COUNT(*) FROM public.tenants');
    const total = parseInt(countResult.rows[0].count);

    return {
      tenants: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create a PostgreSQL schema for a new tenant and set up their tables
   */
  static async createTenantSchema(tenantSchema) {
    // Create the schema
    await queryMain(`CREATE SCHEMA IF NOT EXISTS "${tenantSchema}"`);

    // Create per-tenant tables inside the schema
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        barcode VARCHAR(100),
        category VARCHAR(100),
        buying_price DECIMAL(10,2) DEFAULT 0,
        selling_price DECIMAL(10,2) DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'piece',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "${tenantSchema}".customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "${tenantSchema}".suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "${tenantSchema}".sales (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(50) UNIQUE,
        customer_id INTEGER REFERENCES "${tenantSchema}".customers(id),
        cashier_id INTEGER,
        subtotal DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        payment_reference VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed',
        void_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "${tenantSchema}".sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES "${tenantSchema}".sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES "${tenantSchema}".products(id),
        product_name VARCHAR(255),
        quantity DECIMAL(10,3) DEFAULT 1,
        unit_price DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS "${tenantSchema}".purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES "${tenantSchema}".suppliers(id),
        reference_number VARCHAR(100),
        total DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'received',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "${tenantSchema}".purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER REFERENCES "${tenantSchema}".purchases(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES "${tenantSchema}".products(id),
        product_name VARCHAR(255),
        quantity DECIMAL(10,3) DEFAULT 1,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS "${tenantSchema}".expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(10,2) DEFAULT 0,
        expense_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Get tenant statistics
   */
  static async getStats(tenantId) {
    const tenant = await this.findById(tenantId);
    if (!tenant) return null;

    // Get user count
    const userCount = await queryMain(
      'SELECT COUNT(*) FROM public.tenant_users WHERE tenant_id = $1',
      [tenantId]
    );

    return {
      ...tenant,
      userCount: parseInt(userCount.rows[0].count)
    };
  }
}

module.exports = Tenant;
