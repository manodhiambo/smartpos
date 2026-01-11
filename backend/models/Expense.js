const { queryTenant } = require('../config/database');

class Expense {
  /**
   * Create a new expense
   */
  static async create(tenantSchema, expenseData) {
    const {
      category,
      description,
      amount,
      paymentMethod,
      reference,
      userId,
      expenseDate
    } = expenseData;

    const result = await queryTenant(
      tenantSchema,
      `INSERT INTO expenses (
        category, description, amount, payment_method,
        reference, user_id, expense_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        category,
        description || null,
        amount,
        paymentMethod || 'cash',
        reference || null,
        userId,
        expenseDate || new Date(),
        'approved'
      ]
    );

    return result.rows[0];
  }

  /**
   * Find expense by ID
   */
  static async findById(tenantSchema, expenseId) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT e.*, u.full_name as user_name
       FROM expenses e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = $1`,
      [expenseId]
    );
    return result.rows[0];
  }

  /**
   * Get all expenses with pagination and filters
   */
  static async findAll(tenantSchema, page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT e.*, u.full_name as user_name
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND e.category = $${paramCount++}`;
      params.push(filters.category);
    }

    if (filters.startDate) {
      query += ` AND e.expense_date >= $${paramCount++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND e.expense_date <= $${paramCount++}`;
      params.push(filters.endDate);
    }

    if (filters.status) {
      query += ` AND e.status = $${paramCount++}`;
      params.push(filters.status);
    }

    query += ` ORDER BY e.expense_date DESC, e.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await queryTenant(tenantSchema, query, params);

    let countQuery = 'SELECT COUNT(*) FROM expenses WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (filters.category) {
      countQuery += ` AND category = $${countIndex++}`;
      countParams.push(filters.category);
    }

    if (filters.startDate) {
      countQuery += ` AND expense_date >= $${countIndex++}`;
      countParams.push(filters.startDate);
    }

    if (filters.endDate) {
      countQuery += ` AND expense_date <= $${countIndex++}`;
      countParams.push(filters.endDate);
    }

    const countResult = await queryTenant(tenantSchema, countQuery, countParams);

    return {
      expenses: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Update expense
   */
  static async update(tenantSchema, expenseId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'category', 'description', 'amount', 'payment_method',
      'reference', 'expense_date', 'status'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = $${paramCount++}`);
        values.push(updateData[field]);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(expenseId);

    const result = await queryTenant(
      tenantSchema,
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Get expense summary by category
   */
  static async getSummaryByCategory(tenantSchema, startDate, endDate) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount
       FROM expenses
       WHERE expense_date >= $1 AND expense_date <= $2
       AND status = 'approved'
       GROUP BY category
       ORDER BY total_amount DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Get total expenses for date range
   */
  static async getTotalExpenses(tenantSchema, startDate, endDate) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount
       FROM expenses
       WHERE expense_date >= $1 AND expense_date <= $2
       AND status = 'approved'`,
      [startDate, endDate]
    );

    return result.rows[0];
  }

  /**
   * Get expense categories
   */
  static async getCategories(tenantSchema) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT DISTINCT category, COUNT(*) as count
       FROM expenses
       GROUP BY category
       ORDER BY category`,
      []
    );

    return result.rows;
  }

  /**
   * Delete expense
   */
  static async delete(tenantSchema, expenseId) {
    const result = await queryTenant(
      tenantSchema,
      'DELETE FROM expenses WHERE id = $1 RETURNING id',
      [expenseId]
    );

    return result.rows[0];
  }
}

module.exports = Expense;
