const Customer = require('../models/Customer');

/**
 * Create new customer
 */
exports.createCustomer = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    // Check if phone already exists
    const existingCustomer = await Customer.findByPhone(tenantSchema, req.body.phone);
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    const customer = await Customer.create(tenantSchema, req.body);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    next(error);
  }
};

/**
 * Get all customers
 */
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const result = await Customer.findAll(
      tenantSchema,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.customers,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get customers error:', error);
    next(error);
  }
};

/**
 * Get customer by ID
 */
exports.getCustomerById = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const customer = await Customer.findById(tenantSchema, id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    next(error);
  }
};

/**
 * Search customers
 */
exports.searchCustomers = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }

    const result = await Customer.search(
      tenantSchema,
      q,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.customers,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Search customers error:', error);
    next(error);
  }
};

/**
 * Update customer
 */
exports.updateCustomer = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const customer = await Customer.update(tenantSchema, id, req.body);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    next(error);
  }
};

/**
 * Delete customer
 */
exports.deleteCustomer = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const customer = await Customer.delete(tenantSchema, id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    next(error);
  }
};

/**
 * Get customer purchase history
 */
exports.getCustomerPurchaseHistory = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await Customer.getPurchaseHistory(
      tenantSchema,
      id,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.purchases,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get purchase history error:', error);
    next(error);
  }
};

module.exports = exports;
