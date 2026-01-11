const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create expense (admin, manager)
router.post('/', 
  authorize('admin', 'manager'), 
  expenseController.createExpense
);

// Get all expenses
router.get('/', 
  authorize('admin', 'manager'), 
  expenseController.getAllExpenses
);

// Get expense summary
router.get('/summary', 
  authorize('admin', 'manager'), 
  expenseController.getExpenseSummary
);

// Get total expenses
router.get('/total', 
  authorize('admin', 'manager'), 
  expenseController.getTotalExpenses
);

// Get expense categories
router.get('/categories', 
  authorize('admin', 'manager'), 
  expenseController.getExpenseCategories
);

// Get expense by ID
router.get('/:id', 
  authorize('admin', 'manager'), 
  expenseController.getExpenseById
);

// Update expense (admin, manager)
router.put('/:id', 
  authorize('admin', 'manager'), 
  expenseController.updateExpense
);

// Delete expense (admin only)
router.delete('/:id', 
  authorize('admin'), 
  expenseController.deleteExpense
);

module.exports = router;
