const { queryTenant } = require('../config/database');

class Supplier {
  /**
   * Create a new supplier
   */
  static async create(tenantSchema, supplierData) {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      paymentTerms,
      taxPin
    } = supplierData;

    const result = await queryTenant(
      tenantSchema,
      `INSERT INTO suppliers (
        name, contact_person, phone, email, address,
        payment_terms, tax_pin, balance, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        contactPerson || null,
        phone,
        email || null,
        address || null,
        paymentTerms || 'cash',
        taxPin || null,
        0,
        'active'
      ]
    );

    return result.rows[0];
  }

  /**
   * Find supplier by ID
   */
  static async findById(tenantSchema, supplierId) {
    const result = await queryTenant(
      tenantSchema,
      'SELECT * FROM suppliers WHERE id = $1',
      [supplierId]
    );
    return result.rows[0];
  }

  /**
   * Get all suppliers with pagination
   */
  static async findAll(tenantSchema, page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM suppliers WHERE status = $1';
    const params = ['active'];
    let paramCount = 2;

    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ` ORDER BY name LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await queryTenant(tenantSchema, query, params);

    const countResult = await queryTenant(
      tenantSchema,
      'SELECT COUNT(*) FROM suppliers WHERE status = $1',
      ['active']
    );

    return {
      suppliers: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Update supplier
   */
  static async update(tenantSchema, supplierId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'contact_person', 'phone', 'email', 'address',
      'payment_terms', 'tax_pin', 'status'
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
    values.push(supplierId);

    const result = await queryTenant(
      tenantSchema,
      `UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update supplier balance
   */
  static async updateBalance(tenantSchema, supplierId, amount, operation = 'add') {
    const operator = operation === 'add' ? '+' : '-';

    const result = await queryTenant(
      tenantSchema,
      `UPDATE suppliers 
       SET balance = balance ${operator} $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [Math.abs(amount), supplierId]
    );

    return result.rows[0];
  }

  /**
   * Get suppliers with outstanding balance
   */
  static async getWithBalance(tenantSchema) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT * FROM suppliers 
       WHERE balance > 0 AND status = 'active'
       ORDER BY balance DESC`,
      []
    );

    return result.rows;
  }

  /**
   * Get supplier statement
   */
  static async getStatement(tenantSchema, supplierId, startDate, endDate) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        p.id,
        p.invoice_no,
        p.total_cost,
        p.amount_paid,
        p.balance,
        p.created_at,
        'purchase' as type
       FROM purchases p
       WHERE p.supplier_id = $1
       AND p.created_at >= $2
       AND p.created_at <= $3
       ORDER BY p.created_at DESC`,
      [supplierId, startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Delete supplier (soft delete)
   */
  static async delete(tenantSchema, supplierId) {
    const result = await queryTenant(
      tenantSchema,
      `UPDATE suppliers 
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [supplierId]
    );

    return result.rows[0];
  }
}

module.exports = Supplier;
