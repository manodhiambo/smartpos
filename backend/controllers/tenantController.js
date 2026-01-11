const Tenant = require('../models/Tenant');

/**
 * Get current tenant information
 */
exports.getTenantInfo = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const tenant = await Tenant.getStats(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: tenant.id,
        businessName: tenant.business_name,
        businessEmail: tenant.business_email,
        businessPhone: tenant.business_phone,
        businessAddress: tenant.business_address,
        mpesaTillNumber: tenant.mpesa_till_number,
        mpesaPaybill: tenant.mpesa_paybill,
        mpesaAccountNumber: tenant.mpesa_account_number,
        subscriptionStatus: tenant.subscription_status,
        subscriptionPlan: tenant.subscription_plan,
        userCount: tenant.usercount,
        createdAt: tenant.created_at
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

module.exports = exports;
