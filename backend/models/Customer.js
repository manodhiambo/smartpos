const { queryTenant } = require('../config/database');

class Customer {
  /**
   * Create a new customer
   */
  static async create(tenantSchema, customerData) {
    const {
      name,
      phone,
      email,
      address,
      loyaltyPoints
    } = customerData;

    const result = await queryTenant(
      tenantSchema,
      `INSERT INTO customers (
        name, phone, email, address, loyalty_points, credit_balance, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        phone,
        email || null,
        address || null,
        loyaltyPoints || 0,
        0,
        'active'
      ]
    );

    return result.rows[0];
  }

  /**
   * Find customer by ID
   */
  static async findById(tenantSchema, customerId) {
    const result = await queryTenant(
      tenantSchema,
      'SELECT * FROM customers WHERE id = $1',
      [customerId]
    );
    return result.rows[0];
  }

  /**
   * Find customer by phone
   */
  static async findByPhone(tenantSchema, phone) {
    const result = await queryTenant(
      tenantSchema,
      'SELECT * FROM customers WHERE phone = $1 AND status = $2',
      [phone, 'active']
    );
    return result.rows[0];
  }

  /**
   * Search customers
   */
  static async search(tenantSchema, searchTerm, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${searchTerm}%`;

    const result = await queryTenant(
      tenantSchema,
      `SELECT * FROM customers 
       WHERE (name ILIKE $1 OR phone ILIKE $1)
       AND status = 'active'
       ORDER BY name
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      `SELECT COUNT(*) FROM customers 
       WHERE (name ILIKE $1 OR phone ILIKE $1)
       AND status = 'active'`,
      [searchPattern]
    );

    return {
      customers: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Get all customers
   */
  static async findAll(tenantSchema, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const result = await queryTenant(
      tenantSchema,
      `SELECT * FROM customers 
       WHERE status = 'active'
       ORDER BY name
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      'SELECT COUNT(*) FROM customers WHERE status = $1',
      ['active']
    );

    return {
      customers: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Update customer
   */
  static async update(tenantSchema, customerId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'phone', 'email', 'address', 'status'];

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
    values.push(customerId);

    const result = await queryTenant(
      tenantSchema,
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update loyalty points
   */
  static async updateLoyaltyPoints(tenantSchema, customerId, points, operation = 'add') {
    const operator = operation === 'add' ? '+' : '-';

    const result = await queryTenant(
      tenantSchema,
      `UPDATE customers 
       SET loyalty_points = loyalty_points ${operator} $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [Math.abs(points), customerId]
    );

    return result.rows[0];
  }

  /**
   * Get customer purchase history
   */
  static async getPurchaseHistory(tenantSchema, customerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const result = await queryTenant(
      tenantSchema,
      `SELECT * FROM sales 
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      'SELECT COUNT(*) FROM sales WHERE customer_id = $1',
      [customerId]
    );

    return {
      purchases: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Delete customer (soft delete)
   */
  static async delete(tenantSchema, customerId) {
    const result = await queryTenant(
      tenantSchema,
      `UPDATE customers 
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [customerId]
    );

    return result.rows[0];
  }
}

module.exports = Customer;
