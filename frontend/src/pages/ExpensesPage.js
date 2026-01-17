import React, { useState, useEffect } from 'react';
import { expensesAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaMoneyBillWave, FaFilter } from 'react-icons/fa';
import { formatCurrency, formatDate, getDateRange } from '../utils/helpers';
import toast from 'react-hot-toast';

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    category: ''
  });
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'cash',
    reference: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const expenseCategories = [
    'Rent',
    'Utilities',
    'Salaries',
    'Transport',
    'Maintenance',
    'Marketing',
    'Supplies',
    'Insurance',
    'Taxes',
    'Miscellaneous'
  ];

  useEffect(() => {
    fetchExpenses();
  }, [pagination.page, filters]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: filters.startDate ? `${filters.startDate}T00:00:00Z` : undefined,
        endDate: filters.endDate ? `${filters.endDate}T23:59:59Z` : undefined,
        category: filters.category || undefined
      };

      const response = await expensesAPI.getAll(params);
      setExpenses(response.data.data);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, data);
        toast.success('Expense updated successfully');
      } else {
        await expensesAPI.create(data);
        toast.success('Expense recorded successfully');
      }

      setShowModal(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount,
      paymentMethod: expense.payment_method,
      reference: expense.reference || '',
      expenseDate: expense.expense_date.split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id, description) => {
    if (!window.confirm(`Are you sure you want to delete this expense?`)) return;

    try {
      await expensesAPI.delete(id);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'cash',
      reference: '',
      expenseDate: new Date().toISOString().split('T')[0]
    });
    setEditingExpense(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDateRangePreset = (preset) => {
    const range = getDateRange(preset);
    setFilters(prev => ({
      ...prev,
      startDate: range.startDate.split('T')[0],
      endDate: range.endDate.split('T')[0]
    }));
  };

  const calculateTotal = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  };

  return (
    <div className="expenses-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track business expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="date-range-presets">
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('today')}>
            Today
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('week')}>
            This Week
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('month')}>
            This Month
          </button>
        </div>

        <div className="filters-grid">
          <div className="input-group">
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="input-group">
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="input-group">
            <label>Category</label>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              {expenseCategories.map((cat, index) => (
                <option key={index} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <button className="btn btn-primary" onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}>
              <FaFilter /> Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="expense-summary">
        <div className="summary-card">
          <FaMoneyBillWave />
          <div>
            <span className="summary-label">Total Expenses</span>
            <span className="summary-value">{formatCurrency(calculateTotal())}</span>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Reference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      <FaMoneyBillWave style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }} />
                      <p>No expenses found</p>
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.expense_date)}</td>
                      <td>
                        <span className="badge badge-info">{expense.category}</span>
                      </td>
                      <td>{expense.description || '-'}</td>
                      <td className="amount-cell">{formatCurrency(expense.amount)}</td>
                      <td>
                        <span className={`badge badge-${expense.payment_method}`}>
                          {expense.payment_method}
                        </span>
                      </td>
                      <td>{expense.reference || '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-icon-primary"
                            onClick={() => handleEdit(expense)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(expense.id, expense.description)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Category *</label>
                  <select name="category" value={formData.category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    {expenseCategories.map((cat, index) => (
                      <option key={index} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Payment Method *</label>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Reference/Receipt No</label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
