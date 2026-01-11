const { queryTenant, transactionTenant } = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');

class Purchase {
  /**
   * Create a new purchase with items
   */
  static async create(tenantSchema, purchaseData) {
    return await transactionTenant(tenantSchema, async (client) => {
      const {
        supplierId,
        userId,
        items,
        subtotal,
        vatAmount,
        totalCost,
        amountPaid,
        paymentMethod,
        notes
      } = purchaseData;

      const invoiceNo = generateInvoiceNumber();
      const balance = totalCost - (amountPaid || 0);

      // Insert purchase record
      const purchaseResult = await client.query(
        `INSERT INTO purchases (
          supplier_id, user_id, invoice_no, subtotal, vat_amount,
          total_cost, amount_paid, balance, payment_method, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          supplierId,
          userId,
          invoiceNo,
          subtotal,
          vatAmount || 0,
          totalCost,
          amountPaid || 0,
          balance,
          paymentMethod || 'credit',
          notes || null,
          'completed'
        ]
      );

      const purchase = purchaseResult.rows[0];

      // Insert purchase items and update stock
      for (const item of items) {
        // Insert purchase item
        await client.query(
          `INSERT INTO purchase_items (
            purchase_id, product_id, quantity, unit_cost, total_cost
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            purchase.id,
            item.productId,
            item.quantity,
            item.unitCost,
            item.totalCost
          ]
        );

        // Update product stock and cost price
        await client.query(
          `UPDATE products 
           SET stock_quantity = stock_quantity + $1,
               cost_price = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [item.quantity, item.unitCost, item.productId]
        );
      }

      // Update supplier balance if not fully paid
      if (balance > 0) {
        await client.query(
          `UPDATE suppliers 
           SET balance = balance + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [balance, supplierId]
        );
      }

      return await this.findById(tenantSchema, purchase.id);
    });
  }

  /**
   * Find purchase by ID with items
   */
  static async findById(tenantSchema, purchaseId) {
    const purchaseResult = await queryTenant(
      tenantSchema,
      `SELECT p.*, s.name as supplier_name, u.full_name as user_name
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [purchaseId]
    );

    if (purchaseResult.rows.length === 0) return null;

    const purchase = purchaseResult.rows[0];

    const itemsResult = await queryTenant(
      tenantSchema,
      `SELECT pi.*, pr.name as product_name, pr.barcode
       FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = $1`,
      [purchaseId]
    );

    purchase.items = itemsResult.rows;

    return purchase;
  }

  /**
   * Get all purchases with pagination
   */
  static async findAll(tenantSchema, page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.*, s.name as supplier_name, u.full_name as user_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.supplierId) {
      query += ` AND p.supplier_id = $${paramCount++}`;
      params.push(filters.supplierId);
    }

    if (filters.startDate) {
      query += ` AND p.created_at >= $${paramCount++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND p.created_at <= $${paramCount++}`;
      params.push(filters.endDate);
    }

    if (filters.status) {
      query += ` AND p.status = $${paramCount++}`;
      params.push(filters.status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await queryTenant(tenantSchema, query, params);

    const countResult = await queryTenant(
      tenantSchema,
      'SELECT COUNT(*) FROM purchases',
      []
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
   * Make payment towards purchase
   */
  static async makePayment(tenantSchema, purchaseId, amount, paymentMethod) {
    return await transactionTenant(tenantSchema, async (client) => {
      // Get current purchase
      const purchaseResult = await client.query(
        'SELECT * FROM purchases WHERE id = $1',
        [purchaseId]
      );

      if (purchaseResult.rows.length === 0) {
        throw new Error('Purchase not found');
      }

      const purchase = purchaseResult.rows[0];

      if (amount > purchase.balance) {
        throw new Error('Payment amount exceeds balance');
      }

      const newBalance = purchase.balance - amount;
      const newAmountPaid = purchase.amount_paid + amount;

      // Update purchase
      const result = await client.query(
        `UPDATE purchases 
         SET amount_paid = $1,
             balance = $2,
             payment_method = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [newAmountPaid, newBalance, paymentMethod, purchaseId]
      );

      // Update supplier balance
      await client.query(
        `UPDATE suppliers 
         SET balance = balance - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [amount, purchase.supplier_id]
      );

      return result.rows[0];
    });
  }

  /**
   * Get purchases summary
   */
  static async getSummary(tenantSchema, startDate, endDate) {
    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        COUNT(*) as total_purchases,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as total_balance
       FROM purchases
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );

    return result.rows[0];
  }
}

module.exports = Purchase;
