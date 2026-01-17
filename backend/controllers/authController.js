const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryMain, transactionTenant } = require('../config/database');
const Tenant = require('../models/Tenant');
const subscriptionService = require('../services/subscriptionService');
const { sendWelcomeEmail } = require('../config/email');

/**
 * Register new tenant
 */
const register = async (req, res) => {
  try {
    const {
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      adminUsername,
      adminPassword,
      adminFullName,
      adminEmail,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    } = req.body;

    // Validate required fields
    if (!businessName || !businessEmail || !adminUsername || !adminPassword || !adminFullName) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if business email already exists
    const existingTenant = await Tenant.findByEmail(businessEmail);
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Business email already registered'
      });
    }

    // Generate unique tenant schema name
    const tenantSchema = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create tenant
    const tenant = await Tenant.create({
      tenantName: businessName,
      tenantSchema,
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    });

    // Create tenant schema and tables
    await Tenant.createTenantSchema(tenantSchema);

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user in public schema
    const userResult = await queryMain(
      `INSERT INTO public.tenant_users 
        (tenant_id, username, password_hash, full_name, email, role, status)
      VALUES ($1, $2, $3, $4, $5, 'admin', 'active')
      RETURNING id, username, full_name, email, role`,
      [tenant.id, adminUsername, passwordHash, adminFullName, adminEmail]
    );

    const adminUser = userResult.rows[0];

    // Start 30-day free trial
    await subscriptionService.startTrial(tenant.id);

    // Send welcome email
    await sendWelcomeEmail(businessEmail, businessName, adminUsername, adminPassword);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: adminUser.id,
        username: adminUser.username,
        tenantId: tenant.id,
        role: adminUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your 30-day free trial has started.',
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
          businessName: tenant.businessName,
          businessEmail: tenant.businessEmail,
          subscriptionPlan: 'trial',
          subscriptionStatus: 'active',
          isTrial: true
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login
 */
const login = async (req, res) => {
  try {
    const { businessEmail, username, password } = req.body;

    if (!businessEmail || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Business email, username, and password are required'
      });
    }

    // Check for super admin login
    if (businessEmail === process.env.SUPER_ADMIN_EMAIL && 
        username === process.env.SUPER_ADMIN_USERNAME) {
      
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2025';
      
      if (password !== superAdminPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const token = jwt.sign(
        {
          userId: 0,
          username: username,
          isSuperAdmin: true
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: 0,
            username: username,
            fullName: 'Super Administrator',
            role: 'super_admin',
            isSuperAdmin: true
          }
        }
      });
    }

    // Regular tenant login
    const tenant = await Tenant.findByEmail(businessEmail);
    if (!tenant) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check subscription status
    const isActive = await subscriptionService.isSubscriptionActive(tenant.id);
    if (!isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue.',
        code: 'SUBSCRIPTION_EXPIRED',
        subscriptionStatus: tenant.subscription_status
      });
    }

    // Find user
    const userResult = await queryMain(
      `SELECT * FROM public.tenant_users 
      WHERE tenant_id = $1 AND username = $2 AND status = 'active'`,
      [tenant.id, username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await queryMain(
      'UPDATE public.tenant_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        tenantId: tenant.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Get subscription info
    const subscription = await subscriptionService.getTenantSubscription(tenant.id);

    res.json({
      success: true,
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
          businessEmail: tenant.business_email,
          subscriptionPlan: subscription.subscription_plan,
          subscriptionStatus: subscription.subscription_status,
          isTrial: subscription.is_trial,
          trialEndsAt: subscription.trial_ends_at,
          subscriptionEndsAt: subscription.subscription_ends_at,
          daysRemaining: Math.max(0, Math.floor(subscription.days_remaining))
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    if (req.user.isSuperAdmin) {
      return res.json({
        success: true,
        data: {
          user: {
            id: 0,
            username: req.user.username,
            fullName: 'Super Administrator',
            role: 'super_admin',
            isSuperAdmin: true
          }
        }
      });
    }

    const subscription = await subscriptionService.getTenantSubscription(req.user.tenantId);

    res.json({
      success: true,
      data: {
        user: req.user,
        subscription: {
          plan: subscription.subscription_plan,
          planName: subscription.display_name,
          status: subscription.subscription_status,
          isTrial: subscription.is_trial,
          expiresAt: subscription.expires_at,
          daysRemaining: Math.max(0, Math.floor(subscription.days_remaining)),
          features: subscription.features
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Update profile
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, email, currentPassword, newPassword } = req.body;

    if (req.user.isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Super admin profile cannot be updated via API'
      });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (fullName) {
      updates.push(`full_name = $${paramCount}`);
      params.push(fullName);
      paramCount++;
    }

    if (email) {
      updates.push(`email = $${paramCount}`);
      params.push(email);
      paramCount++;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password'
        });
      }

      // Verify current password
      const userResult = await queryMain(
        'SELECT password_hash FROM public.tenant_users WHERE id = $1',
        [req.user.id]
      );

      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      updates.push(`password_hash = $${paramCount}`);
      params.push(passwordHash);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.user.id);

    await queryMain(
      `UPDATE public.tenant_users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
