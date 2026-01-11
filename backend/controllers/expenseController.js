const Expense = require('../models/Expense');

/**
 * Create new expense
 */
exports.createExpense = async (req, res, next) => {
  try {
    const { tenantSchema, id: userId } = req.user;

    const expenseData = {
      ...req.body,
      userId
    };

    const expense = await Expense.create(tenantSchema, expenseData);

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    next(error);
  }
};

/**
 * Get all expenses
 */
exports.getAllExpenses = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20, category, startDate, endDate } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await Expense.findAll(
      tenantSchema,
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      data: result.expenses,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    next(error);
  }
};

/**
 * Get expense by ID
 */
exports.getExpenseById = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const expense = await Expense.findById(tenantSchema, id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    next(error);
  }
};

/**
 * Update expense
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const expense = await Expense.update(tenantSchema, id, req.body);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    next(error);
  }
};

/**
 * Delete expense
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const { tenantSchema, role } = req.user;
    const { id } = req.params;

    // Only admin can delete expenses
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete expenses'
      });
    }

    const expense = await Expense.delete(tenantSchema, id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    next(error);
  }
};

/**
 * Get expense summary by category
 */
exports.getExpenseSummary = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const summary = await Expense.getSummaryByCategory(tenantSchema, startDate, endDate);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    next(error);
  }
};

/**
 * Get total expenses
 */
exports.getTotalExpenses = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const total = await Expense.getTotalExpenses(tenantSchema, startDate, endDate);

    res.json({
      success: true,
      data: total
    });
  } catch (error) {
    console.error('Get total expenses error:', error);
    next(error);
  }
};

/**
 * Get expense categories
 */
exports.getExpenseCategories = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const categories = await Expense.getCategories(tenantSchema);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get expense categories error:', error);
    next(error);
  }
};

module.exports = exports;
