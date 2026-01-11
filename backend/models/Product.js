const { queryTenant, transactionTenant } = require('../config/database');

class Product {
  /**
   * Create a new product
   */
  static async create(tenantSchema, productData) {
    const {
      name,
      barcode,
      category,
      subcategory,
      costPrice,
      sellingPrice,
      wholesalePrice,
      vatType,
      unitOfMeasure,
      stockQuantity,
      reorderLevel,
      expiryTracking,
      description
    } = productData;

    const result = await queryTenant(
      tenantSchema,
      `INSERT INTO products (
        name, barcode, category, subcategory, cost_price, selling_price,
        wholesale_price, vat_type, unit_of_measure, stock_quantity,
        reorder_level, expiry_tracking, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name, barcode, category, subcategory || null, costPrice, sellingPrice,
        wholesalePrice || sellingPrice, vatType, unitOfMeasure || 'pcs',
        stockQuantity || 0, reorderLevel || 10, expiryTracking || false,
        description || null, 'active'
      ]
    );

    return result.rows[0];
  }

  /**
   * Find product by ID
   */
  static async findById(tenantSchema, productId) {
    const result = await queryTenant(
      tenantSchema,
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );
    return result.rows[0];
  }

  /**
   * Find product by barcode
   */
  static async findByBarcode(tenantSchema, barcode) {
    const result = await queryTenant(
      tenantSchema,
      'SELECT * FROM products WHERE barcode = $1 AND status = $2',
      [barcode, 'active']
    );
    return result.rows[0];
  }

  /**
   * Search products
   */
  static async search(tenantSchema, searchTerm, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${searchTerm}%`;

    const result = await queryTenant(
      tenantSchema,
      `SELECT * FROM products 
       WHERE (name ILIKE $1 OR barcode ILIKE $1 OR category ILIKE $1)
       AND status = 'active'
       ORDER BY name
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      `SELECT COUNT(*) FROM products 
       WHERE (name ILIKE $1 OR barcode ILIKE $1 OR category ILIKE $1)
       AND status = 'active'`,
      [searchPattern]
    );

    return {
      products: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Get all products with pagination
   */
  static async findAll(tenantSchema, page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM products WHERE status = $1';
    const params = ['active'];
    let paramCount = 2;

    if (filters.category) {
      query += ` AND category = $${paramCount++}`;
      params.push(filters.category);
    }

    if (filters.lowStock) {
      query += ` AND stock_quantity <= reorder_level`;
    }

    query += ` ORDER BY name LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await queryTenant(tenantSchema, query, params);

    const countResult = await queryTenant(
      tenantSchema,
      'SELECT COUNT(*) FROM products WHERE status = $1',
      ['active']
    );

    return {
      products: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Update product
   */
  static async update(tenantSchema, productId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'category', 'subcategory', 'cost_price', 'selling_price',
      'wholesale_price', 'vat_type', 'unit_of_measure', 'reorder_level',
      'expiry_tracking', 'description', 'status'
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
    values.push(productId);

    const result = await queryTenant(
      tenantSchema,
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update stock quantity
   */
  static async updateStock(tenantSchema, productId, quantity, operation = 'add') {
    const operator = operation === 'add' ? '+' : '-';
    
    const result = await queryTenant(
      tenantSchema,
      `UPDATE products 
       SET stock_quantity = stock_quantity ${operator} $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [Math.abs(quantity), productId]
    );

    return result.rows[0];
  }

  /**
   * Get low stock products
   */
  static async getLowStock(tenantSchema) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT * FROM products 
       WHERE stock_quantity <= reorder_level 
       AND status = 'active'
       ORDER BY stock_quantity ASC`,
      []
    );

    return result.rows;
  }

  /**
   * Get categories
   */
  static async getCategories(tenantSchema) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT DISTINCT category, COUNT(*) as product_count
       FROM products 
       WHERE status = 'active'
       GROUP BY category
       ORDER BY category`,
      []
    );

    return result.rows;
  }

  /**
   * Delete product (soft delete)
   */
  static async delete(tenantSchema, productId) {
    const result = await queryTenant(
      tenantSchema,
      `UPDATE products 
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [productId]
    );

    return result.rows[0];
  }

  /**
   * Check if barcode exists
   */
  static async barcodeExists(tenantSchema, barcode, excludeId = null) {
    let query = 'SELECT id FROM products WHERE barcode = $1';
    const params = [barcode];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await queryTenant(tenantSchema, query, params);
    return result.rows.length > 0;
  }
}

module.exports = Product;
