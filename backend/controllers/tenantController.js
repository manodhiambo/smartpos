const Tenant = require('../models/Tenant');
const mpesaService = require('../services/mpesaService');
const { queryMain } = require('../config/database');

/**
 * Get current tenant information
 */
exports.getTenantInfo = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const [tenantResult, userCountResult] = await Promise.all([
      queryMain('SELECT * FROM public.tenants WHERE id = $1', [tenantId]),
      queryMain('SELECT COUNT(*) FROM public.tenant_users WHERE tenant_id = $1', [tenantId])
    ]);

    const t = tenantResult.rows[0];
    if (!t) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.json({
      success: true,
      data: {
        id: t.id,
        businessName: t.business_name,
        businessEmail: t.business_email,
        businessPhone: t.business_phone,
        businessAddress: t.business_address,
        mpesaTillNumber: t.mpesa_till_number,
        mpesaPaybill: t.mpesa_paybill,
        mpesaAccountNumber: t.mpesa_account_number,
        subscriptionStatus: t.subscription_status,
        subscriptionPlan: t.subscription_plan,
        userCount: parseInt(userCountResult.rows[0].count),
        createdAt: t.created_at,
        // Daraja — consumer key visible, secret/passkey only existence flag
        darajaConsumerKey: t.mpesa_consumer_key || '',
        darajaConsumerSecretSet: !!(t.mpesa_consumer_secret),
        darajaPasskeySet: !!(t.mpesa_passkey),
        darajaEnvironment: t.mpesa_environment || 'sandbox'
      }
    });
  } catch (error) {
    console.error('Get tenant info error:', error);
    next(error);
  }
};

/**
 * Update tenant information
 */
exports.updateTenantInfo = async (req, res, next) => {
  try {
    const { tenantId, role } = req.user;

    // Only admin can update tenant info
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update tenant information'
      });
    }

    const tenant = await Tenant.update(tenantId, req.body);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'Tenant information updated successfully',
      data: {
        id: tenant.id,
        businessName: tenant.business_name,
        businessEmail: tenant.business_email,
        businessPhone: tenant.business_phone,
        businessAddress: tenant.business_address,
        mpesaTillNumber: tenant.mpesa_till_number,
        mpesaPaybill: tenant.mpesa_paybill,
        mpesaAccountNumber: tenant.mpesa_account_number
      }
    });
  } catch (error) {
    console.error('Update tenant info error:', error);
    next(error);
  }
};

/**
 * Update M-Pesa settings
 */
exports.updateMpesaSettings = async (req, res, next) => {
  try {
    const { tenantId, role } = req.user;

    // Only admin can update M-Pesa settings
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update M-Pesa settings'
      });
    }

    const { mpesaTillNumber, mpesaPaybill, mpesaAccountNumber } = req.body;

    const tenant = await Tenant.update(tenantId, {
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    });

    res.json({
      success: true,
      message: 'M-Pesa settings updated successfully',
      data: {
        mpesaTillNumber: tenant.mpesa_till_number,
        mpesaPaybill: tenant.mpesa_paybill,
        mpesaAccountNumber: tenant.mpesa_account_number
      }
    });
  } catch (error) {
    console.error('Update M-Pesa settings error:', error);
    next(error);
  }
};

/**
 * Update Daraja API credentials
 */
exports.updateDarajaSettings = async (req, res, next) => {
  try {
    const { tenantId, role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { consumerKey, consumerSecret, passkey, environment } = req.body;

    // Treat the placeholder string as "no change"
    const PLACEHOLDER = '••••••••';
    const result = await Tenant.updateDarajaSettings(tenantId, {
      consumerKey: consumerKey || null,
      consumerSecret: consumerSecret === PLACEHOLDER ? null : (consumerSecret || null),
      passkey: passkey === PLACEHOLDER ? null : (passkey || null),
      environment: environment || null
    });

    res.json({
      success: true,
      message: 'Daraja API settings saved',
      data: {
        darajaConsumerKey: result.mpesa_consumer_key || '',
        darajaConsumerSecretSet: result.secret_set,
        darajaPasskeySet: result.passkey_set,
        darajaEnvironment: result.mpesa_environment || 'sandbox'
      }
    });
  } catch (error) {
    console.error('Update Daraja error:', error);
    next(error);
  }
};

/**
 * Test Daraja API connection using tenant's saved credentials
 */
exports.testDarajaConnection = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const full = await queryMain('SELECT * FROM public.tenants WHERE id = $1', [tenantId]);
    const tenant = full.rows[0];

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const key = tenant.mpesa_consumer_key;
    const secret = tenant.mpesa_consumer_secret;

    if (!key || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Consumer Key and Consumer Secret are required. Save them first.'
      });
    }

    try {
      const token = await mpesaService.getAccessToken(key, secret, tenant.mpesa_environment);
      res.json({
        success: true,
        message: `Connected successfully to Safaricom Daraja (${tenant.mpesa_environment || 'sandbox'})`,
        tokenPreview: token ? token.substring(0, 8) + '...' : null
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'Connection failed: ' + (err.message || 'Invalid credentials')
      });
    }
  } catch (error) {
    console.error('Test Daraja error:', error);
    next(error);
  }
};

module.exports = exports;
