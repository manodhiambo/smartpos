const Supplier = require('../models/Supplier');

/**
 * Create new supplier
 */
exports.createSupplier = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const supplier = await Supplier.create(tenantSchema, req.body);

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    next(error);
  }
};

/**
 * Get all suppliers
 */
exports.getAllSuppliers = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20, search } = req.query;

    const filters = {};
    if (search) filters.search = search;

    const result = await Supplier.findAll(
      tenantSchema,
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      data: result.suppliers,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    next(error);
  }
};

/**
 * Get supplier by ID
 */
exports.getSupplierById = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const supplier = await Supplier.findById(tenantSchema, id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    next(error);
  }
};

/**
 * Update supplier
 */
exports.updateSupplier = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const supplier = await Supplier.update(tenantSchema, id, req.body);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    next(error);
  }
};

/**
 * Delete supplier
 */
exports.deleteSupplier = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const supplier = await Supplier.delete(tenantSchema, id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    next(error);
  }
};

/**
 * Get suppliers with outstanding balance
 */
exports.getSuppliersWithBalance = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const suppliers = await Supplier.getWithBalance(tenantSchema);

    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    console.error('Get suppliers with balance error:', error);
    next(error);
  }
};

/**
 * Get supplier statement
 */
exports.getSupplierStatement = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const statement = await Supplier.getStatement(tenantSchema, id, startDate, endDate);

    res.json({
      success: true,
      data: statement
    });
  } catch (error) {
    console.error('Get supplier statement error:', error);
    next(error);
  }
};

module.exports = exports;
