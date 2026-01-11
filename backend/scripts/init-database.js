const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const initDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗄️  SmartPOS Database Initialization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Create public schema tables
    console.log('📋 Creating public schema tables...');
    await client.query(`
      -- Tenants table
      CREATE TABLE IF NOT EXISTS public.tenants (
        id SERIAL PRIMARY KEY,
        tenant_name VARCHAR(255) NOT NULL,
        tenant_schema VARCHAR(63) NOT NULL UNIQUE,
        business_name VARCHAR(255) NOT NULL,
        business_email VARCHAR(255) NOT NULL UNIQUE,
        business_phone VARCHAR(20),
        business_address TEXT,
        subscription_status VARCHAR(50) DEFAULT 'active',
        subscription_plan VARCHAR(50) DEFAULT 'free',
        mpesa_till_number VARCHAR(20),
        mpesa_paybill VARCHAR(20),
        mpesa_account_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tenant users table
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

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_tenants_schema ON public.tenants(tenant_schema);
      CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(business_email);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_username ON public.tenant_users(username);
    `);
    console.log('✅ Public schema tables created\n');

    // Check if default admin tenant exists
    console.log('👤 Checking for default admin tenant...');
    const tenantCheck = await client.query(
      "SELECT id FROM public.tenants WHERE tenant_schema = 'admin_tenant'"
    );

    let adminTenantId;

    if (tenantCheck.rows.length === 0) {
      console.log('📝 Creating default admin tenant...');
      const tenantResult = await client.query(`
        INSERT INTO public.tenants (
          tenant_name, tenant_schema, business_name, 
          business_email, business_phone, subscription_status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'SmartPOS Demo Store',
        'admin_tenant',
        'SmartPOS Demo Supermarket',
        'demo@smartpos.com',
        '+254712345678',
        'active'
      ]);
      adminTenantId = tenantResult.rows[0].id;
      console.log(`✅ Admin tenant created (ID: ${adminTenantId})\n`);
    } else {
      adminTenantId = tenantCheck.rows[0].id;
      console.log(`ℹ️  Admin tenant already exists (ID: ${adminTenantId})\n`);
    }

    // Create tenant schema
    console.log('📂 Creating tenant schema...');
    await client.query('CREATE SCHEMA IF NOT EXISTS "admin_tenant"');
    console.log('✅ Tenant schema created\n');

    // Create tenant tables
    console.log('📋 Creating tenant tables...');
    await client.query(`
      SET search_path TO "admin_tenant";

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        barcode VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        cost_price DECIMAL(10,2) NOT NULL,
        selling_price DECIMAL(10,2) NOT NULL,
        wholesale_price DECIMAL(10,2),
        vat_type VARCHAR(20) DEFAULT 'vatable',
        unit_of_measure VARCHAR(20) DEFAULT 'pcs',
        stock_quantity DECIMAL(10,2) DEFAULT 0,
        reorder_level DECIMAL(10,2) DEFAULT 10,
        expiry_tracking BOOLEAN DEFAULT false,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Sales table
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        receipt_no VARCHAR(50) NOT NULL UNIQUE,
        cashier_id INTEGER REFERENCES users(id),
        customer_id INTEGER,
        subtotal DECIMAL(10,2) NOT NULL,
        vat_amount DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        amount_paid DECIMAL(10,2) NOT NULL,
        change_amount DECIMAL(10,2) DEFAULT 0,
        mpesa_code VARCHAR(50),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Sale Items table
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        vat_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Suppliers table
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        address TEXT,
        payment_terms VARCHAR(50) DEFAULT 'cash',
        tax_pin VARCHAR(50),
        balance DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Purchases table
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id),
        user_id INTEGER REFERENCES users(id),
        invoice_no VARCHAR(50) NOT NULL UNIQUE,
        subtotal DECIMAL(10,2) NOT NULL,
        vat_amount DECIMAL(10,2) DEFAULT 0,
        total_cost DECIMAL(10,2) NOT NULL,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        balance DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Purchase Items table
      CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity DECIMAL(10,2) NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(255),
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        credit_balance DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash',
        reference VARCHAR(100),
        user_id INTEGER REFERENCES users(id),
        expense_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

      RESET search_path;
    `);
    console.log('✅ Tenant tables created\n');

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'Admin';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Mycat@95';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const userCheck = await client.query(
      'SELECT id FROM public.tenant_users WHERE tenant_id = $1 AND username = $2',
      [adminTenantId, adminUsername]
    );

    if (userCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO public.tenant_users (
          tenant_id, username, password_hash, full_name, 
          email, role, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        adminTenantId,
        adminUsername,
        passwordHash,
        'System Administrator',
        'demo@smartpos.com',
        'admin',
        'active'
      ]);
      console.log('✅ Default admin user created');
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Password: ${adminPassword}\n`);
    } else {
      console.log('ℹ️  Default admin user already exists\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database initialization completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 You can now start the server with: npm start\n');

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run initialization
initDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
