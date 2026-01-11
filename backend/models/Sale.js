const { queryTenant, transactionTenant } = require('../config/database');
const { generateReceiptNumber, calculateVAT } = require('../utils/helpers');

class Sale {
  /**
   * Create a new sale with items
   */
  static async create(tenantSchema, saleData) {
    return await transactionTenant(tenantSchema, async (client) => {
      const {
        cashierId,
        customerId,
        items,
        subtotal,
        vatAmount,
        discount,
        totalAmount,
        paymentMethod,
        amountPaid,
        changeAmount,
        mpesaCode,
        notes
      } = saleData;

      const receiptNo = generateReceiptNumber();

      // Insert sale record
      const saleResult = await client.query(
        `INSERT INTO sales (
          receipt_no, cashier_id, customer_id, subtotal, vat_amount,
          discount, total_amount, payment_method, amount_paid,
          change_amount, mpesa_code, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          receiptNo, cashierId, customerId || null, subtotal, vatAmount,
          discount || 0, totalAmount, paymentMethod, amountPaid,
          changeAmount || 0, mpesaCode || null, notes || null, 'completed'
        ]
      );

      const sale = saleResult.rows[0];

      // Insert sale items and update stock
      for (const item of items) {
        // Insert sale item
        await client.query(
          `INSERT INTO sale_items (
            sale_id, product_id, product_name, quantity, unit_price,
            subtotal, vat_amount, total, discount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sale.id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.subtotal,
            item.vatAmount || 0,
            item.total,
            item.discount || 0
          ]
        );

        // Update product stock
        await client.query(
          `UPDATE products 
           SET stock_quantity = stock_quantity - $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [item.quantity, item.productId]
        );
      }

      // Get complete sale with items
      return await this.findById(tenantSchema, sale.id);
    });
  }

  /**
   * Find sale by ID with items
   */
  static async findById(tenantSchema, saleId) {
    const saleResult = await queryTenant(
      tenantSchema,
      `SELECT s.*, u.full_name as cashier_name, c.name as customer_name
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [saleId]
    );

    if (saleResult.rows.length === 0) return null;

    const sale = saleResult.rows[0];

    // Get sale items
    const itemsResult = await queryTenant(
      tenantSchema,
      `SELECT si.*, p.barcode
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [saleId]
    );

    sale.items = itemsResult.rows;

    return sale;
  }

  /**
   * Find sale by receipt number
   */
  static async findByReceiptNo(tenantSchema, receiptNo) {
    const saleResult = await queryTenant(
      tenantSchema,
      `SELECT s.*, u.full_name as cashier_name, c.name as customer_name
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.receipt_no = $1`,
      [receiptNo]
    );

    if (saleResult.rows.length === 0) return null;

    const sale = saleResult.rows[0];

    const itemsResult = await queryTenant(
      tenantSchema,
      `SELECT si.*, p.barcode
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [sale.id]
    );

    sale.items = itemsResult.rows;

    return sale;
  }

  /**
   * Get all sales with pagination and filters
   */
  static async findAll(tenantSchema, page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT s.*, u.full_name as cashier_name, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.cashierId) {
      query += ` AND s.cashier_id = $${paramCount++}`;
      params.push(filters.cashierId);
    }

    if (filters.paymentMethod) {
      query += ` AND s.payment_method = $${paramCount++}`;
      params.push(filters.paymentMethod);
    }

    if (filters.startDate) {
      query += ` AND s.created_at >= $${paramCount++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND s.created_at <= $${paramCount++}`;
      params.push(filters.endDate);
    }

    if (filters.status) {
      query += ` AND s.status = $${paramCount++}`;
      params.push(filters.status);
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await queryTenant(tenantSchema, query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM sales WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (filters.cashierId) {
      countQuery += ` AND cashier_id = $${countParamIndex++}`;
      countParams.push(filters.cashierId);
    }

    if (filters.paymentMethod) {
      countQuery += ` AND payment_method = $${countParamIndex++}`;
      countParams.push(filters.paymentMethod);
    }

    if (filters.startDate) {
      countQuery += ` AND created_at >= $${countParamIndex++}`;
      countParams.push(filters.startDate);
    }

    if (filters.endDate) {
      countQuery += ` AND created_at <= $${countParamIndex++}`;
      countParams.push(filters.endDate);
    }

    const countResult = await queryTenant(tenantSchema, countQuery, countParams);

    return {
      sales: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Get today's sales summary
   */
  static async getTodaySummary(tenantSchema) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN total_amount ELSE 0 END), 0) as mpesa_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(vat_amount), 0) as total_vat
       FROM sales
       WHERE DATE(created_at) = CURRENT_DATE
       AND status = 'completed'`,
      []
    );

    return result.rows[0];
  }

  /**
   * Get sales report by date range
   */
  static async getReport(tenantSchema, startDate, endDate) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        DATE(created_at) as sale_date,
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        SUM(vat_amount) as total_vat,
        AVG(total_amount) as avg_sale_value
       FROM sales
       WHERE created_at >= $1 AND created_at <= $2
       AND status = 'completed'
       GROUP BY DATE(created_at)
       ORDER BY sale_date DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Get top selling products
   */
  static async getTopProducts(tenantSchema, limit = 10, startDate = null, endDate = null) {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.category,
        SUM(si.quantity) as total_quantity,
        SUM(si.total) as total_revenue,
        COUNT(DISTINCT si.sale_id) as times_sold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
    `;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND s.created_at >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND s.created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ` GROUP BY p.id, p.name, p.barcode, p.category
               ORDER BY total_quantity DESC
               LIMIT $${paramCount}`;
    params.push(limit);

    const result = await queryTenant(tenantSchema, query, params);
    return result.rows;
  }

  /**
   * Get cashier performance
   */
  static async getCashierPerformance(tenantSchema, startDate, endDate) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        u.id,
        u.full_name,
        COUNT(s.id) as total_sales,
        SUM(s.total_amount) as total_revenue,
        AVG(s.total_amount) as avg_sale_value
       FROM sales s
       JOIN users u ON s.cashier_id = u.id
       WHERE s.created_at >= $1 AND s.created_at <= $2
       AND s.status = 'completed'
       GROUP BY u.id, u.full_name
       ORDER BY total_revenue DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Void/Cancel a sale
   */
  static async void(tenantSchema, saleId, reason, userId) {
    return await transactionTenant(tenantSchema, async (client) => {
      // Get sale items to restore stock
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM sale_items WHERE sale_id = $1',
        [saleId]
      );

      // Restore stock for each item
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE products 
           SET stock_quantity = stock_quantity + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }

      // Update sale status
      const result = await client.query(
        `UPDATE sales 
         SET status = 'voided',
             notes = CONCAT(COALESCE(notes, ''), ' | VOIDED: ', $1, ' by user ID: ', $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [reason, userId, saleId]
      );

      return result.rows[0];
    });
  }

  /**
   * Get sales by payment method
   */
  static async getByPaymentMethod(tenantSchema, startDate, endDate) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as total
       FROM sales
       WHERE created_at >= $1 AND created_at <= $2
       AND status = 'completed'
       GROUP BY payment_method
       ORDER BY total DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }
}

module.exports = Sale;
