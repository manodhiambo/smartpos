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
        tenant_name, tenant_schema,
        business_name, business_email,
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
   * Create a PostgreSQL schema for a new tenant and set up their tables.
   * tenantId is used to create a `users` view so models can JOIN users by cashier_id/user_id.
   */
  static async createTenantSchema(tenantSchema, tenantId) {
    // Create the schema
    await queryMain(`CREATE SCHEMA IF NOT EXISTS "${tenantSchema}"`);

    // products
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        barcode VARCHAR(100),
        category VARCHAR(100),
        subcategory VARCHAR(100),
        cost_price DECIMAL(10,2) DEFAULT 0,
        selling_price DECIMAL(10,2) DEFAULT 0,
        wholesale_price DECIMAL(10,2) DEFAULT 0,
        vat_type VARCHAR(20) DEFAULT 'vat_inclusive',
        unit_of_measure VARCHAR(50) DEFAULT 'pcs',
        stock_quantity DECIMAL(10,3) DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        expiry_tracking BOOLEAN DEFAULT false,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // customers
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        credit_balance DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // suppliers
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        payment_terms VARCHAR(50) DEFAULT 'cash',
        tax_pin VARCHAR(50),
        balance DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // sales
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".sales (
        id SERIAL PRIMARY KEY,
        receipt_no VARCHAR(50) UNIQUE,
        cashier_id INTEGER,
        customer_id INTEGER REFERENCES "${tenantSchema}".customers(id),
        subtotal DECIMAL(10,2) DEFAULT 0,
        vat_amount DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        amount_paid DECIMAL(10,2) DEFAULT 0,
        change_amount DECIMAL(10,2) DEFAULT 0,
        mpesa_code VARCHAR(100),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // sale_items
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES "${tenantSchema}".sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES "${tenantSchema}".products(id),
        product_name VARCHAR(255),
        quantity DECIMAL(10,3) DEFAULT 1,
        unit_price DECIMAL(10,2) DEFAULT 0,
        subtotal DECIMAL(10,2) DEFAULT 0,
        vat_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0
      )
    `);

    // purchases
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES "${tenantSchema}".suppliers(id),
        user_id INTEGER,
        invoice_no VARCHAR(100),
        subtotal DECIMAL(10,2) DEFAULT 0,
        vat_amount DECIMAL(10,2) DEFAULT 0,
        total_cost DECIMAL(10,2) DEFAULT 0,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        balance DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // purchase_items
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER REFERENCES "${tenantSchema}".purchases(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES "${tenantSchema}".products(id),
        quantity DECIMAL(10,3) DEFAULT 1,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        total_cost DECIMAL(10,2) DEFAULT 0
      )
    `);

    // expenses
    await queryMain(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        reference VARCHAR(100),
        user_id INTEGER,
        expense_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // users VIEW — lets models JOIN users on cashier_id/user_id
    // Maps to public.tenant_users filtered by this tenant
    if (tenantId) {
      await queryMain(`
        CREATE OR REPLACE VIEW "${tenantSchema}".users AS
          SELECT id, username, full_name, email, role, status, last_login, created_at, updated_at
          FROM public.tenant_users
          WHERE tenant_id = '${tenantId}'::uuid
      `);
    }
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
