const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../config/email');
const { generateRandomPassword } = require('../utils/helpers');
const { queryMain } = require('../config/database');

/**
 * Generate JWT token
 */
const generateToken = (userId, tenantId) => {
  return jwt.sign(
    { userId, tenantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

/**
 * Register new tenant (store)
 */
exports.registerTenant = async (req, res, next) => {
  try {
    const {
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      adminUsername,
      adminPassword,
      adminFullName,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    } = req.body;

    // Check if email already exists
    const existingTenant = await Tenant.findByEmail(businessEmail);
    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'Business email already registered'
      });
    }

    // Create tenant
    const tenant = await Tenant.create({
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    });

    // Create tenant schema
    await queryMain(`CREATE SCHEMA IF NOT EXISTS "${tenant.tenant_schema}"`);

    // Create tenant tables
    await createTenantTables(tenant.tenant_schema);

    // Create admin user
    const adminUser = await User.create({
      tenantId: tenant.id,
      username: adminUsername,
      password: adminPassword,
      fullName: adminFullName,
      email: businessEmail,
      role: 'admin'
    });

    // Send welcome email
    await sendWelcomeEmail(
      businessEmail,
      businessName,
      adminUsername,
      adminPassword
    );

    // Generate token
    const token = generateToken(adminUser.id, tenant.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to SmartPOS',
      data: {
        token,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          fullName: adminUser.full_name,
          email: adminUser.email,
          role: adminUser.role
        },
        tenant: {
          id: tenant.id,
          businessName: tenant.business_name,
          businessEmail: tenant.business_email
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password, businessEmail } = req.body;

    // Find tenant by business email
    const tenant = await Tenant.findByEmail(businessEmail);
    if (!tenant) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check tenant subscription
    if (tenant.subscription_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please contact support.'
      });
    }

    // Find user
    const user = await User.findByUsername(username, tenant.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user.id, tenant.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: user.role
        },
        tenant: {
          id: tenant.id,
          businessName: tenant.business_name,
          schema: tenant.tenant_schema
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login,
        businessName: user.business_name,
        tenantSchema: user.tenant_schema
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    next(error);
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, currentPassword, newPassword } = req.body;

    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password'
        });
      }

      const user = await User.findById(req.user.id);
      const isValid = await User.verifyPassword(currentPassword, user.password_hash);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      updateData.password = newPassword;
    }

    const updatedUser = await User.update(req.user.id, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.full_name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};

/**
 * Logout user (client-side token removal)
 */
exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

/**
 * Helper function to create tenant tables
 */
async function createTenantTables(schema) {
  await queryMain(`
    SET search_path TO "${schema}";

    -- Users table (tenant-specific users)
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
}

module.exports = exports;
