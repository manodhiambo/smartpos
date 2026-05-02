const { queryTenant, queryMain } = require('../config/database');

/**
 * Ensure returns and return_items tables exist in the tenant schema.
 * Called at the start of each handler so existing tenants work without
 * a full schema re-creation.
 */
async function ensureReturnTables(tenantSchema) {
  await queryMain(`CREATE TABLE IF NOT EXISTS "${tenantSchema}".returns (
    id SERIAL PRIMARY KEY,
    return_no VARCHAR(30) UNIQUE,
    original_sale_id INTEGER,
    original_receipt_no VARCHAR(50),
    processed_by INTEGER,
    customer_id INTEGER,
    reason TEXT NOT NULL,
    refund_method VARCHAR(50) DEFAULT 'cash',
    total_refund DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await queryMain(`CREATE TABLE IF NOT EXISTS "${tenantSchema}".return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER REFERENCES "${tenantSchema}".returns(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    restock BOOLEAN DEFAULT true,
    condition VARCHAR(20) DEFAULT 'good',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

/**
 * Generate a return number: RTN-YYYYMMDD-XXXX
 */
async function generateReturnNo(tenantSchema) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const countResult = await queryTenant(
    tenantSchema,
    `SELECT COUNT(*) FROM returns
     WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'`
  );
  const count = parseInt(countResult.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `RTN-${datePart}-${seq}`;
}

/**
 * POST /returns
 * Create a new return transaction.
 * Body: { originalSaleId, items, reason, refundMethod, notes }
 * items: [{ productId, productName, quantity, unitPrice, restock, condition }]
 */
exports.createReturn = async (req, res, next) => {
  try {
    const { tenantSchema, id: processedBy } = req.user;
    const { originalSaleId, items, reason, refundMethod = 'cash', notes } = req.body;

    // Basic validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Return reason is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one return item is required'
      });
    }

    await ensureReturnTables(tenantSchema);

    // Look up original sale if provided
    let originalReceiptNo = null;
    let customerId = null;

    if (originalSaleId) {
      const saleResult = await queryTenant(
        tenantSchema,
        'SELECT id, receipt_no, customer_id FROM sales WHERE id = $1',
        [originalSaleId]
      );

      if (saleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Original sale not found: ${originalSaleId}`
        });
      }

      const originalSale = saleResult.rows[0];
      originalReceiptNo = originalSale.receipt_no;
      customerId = originalSale.customer_id;
    }

    // Validate each return item
    const validatedItems = [];

    for (const item of items) {
      const { productId, quantity, restock = true, condition = 'good' } = item;

      if (!productId || !quantity || parseFloat(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each return item must have a valid productId and quantity'
        });
      }

      // Fetch product details
      const productResult = await queryTenant(
        tenantSchema,
        'SELECT id, name, selling_price, stock_quantity FROM products WHERE id = $1 AND status = $2',
        [productId, 'active']
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${productId}`
        });
      }

      const product = productResult.rows[0];

      // If we have an original sale, validate return quantity <= sold quantity
      if (originalSaleId) {
        const soldResult = await queryTenant(
          tenantSchema,
          'SELECT COALESCE(SUM(quantity), 0) AS sold_qty FROM sale_items WHERE sale_id = $1 AND product_id = $2',
          [originalSaleId, productId]
        );

        const soldQty = parseFloat(soldResult.rows[0].sold_qty);
        if (parseFloat(quantity) > soldQty) {
          return res.status(400).json({
            success: false,
            message: `Return quantity (${quantity}) exceeds sold quantity (${soldQty}) for product: ${product.name}`
          });
        }
      }

      const unitPrice = parseFloat(item.unitPrice) || parseFloat(product.selling_price);
      const subtotal = parseFloat(quantity) * unitPrice;

      validatedItems.push({
        productId,
        productName: product.name,
        quantity: parseFloat(quantity),
        unitPrice,
        subtotal,
        restock: Boolean(restock),
        condition
      });
    }

    // Calculate total refund
    const totalRefund = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Generate return number
    const returnNo = await generateReturnNo(tenantSchema);

    // Insert the return record
    const returnResult = await queryTenant(
      tenantSchema,
      `INSERT INTO returns (
        return_no, original_sale_id, original_receipt_no,
        processed_by, customer_id, reason,
        refund_method, total_refund, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        returnNo,
        originalSaleId || null,
        originalReceiptNo,
        processedBy,
        customerId,
        reason.trim(),
        refundMethod,
        totalRefund,
        'completed',
        notes || null
      ]
    );

    const returnRecord = returnResult.rows[0];

    // Insert return items and optionally restock
    for (const item of validatedItems) {
      await queryTenant(
        tenantSchema,
        `INSERT INTO return_items (
          return_id, product_id, product_name,
          quantity, unit_price, subtotal,
          restock, condition
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          returnRecord.id,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.subtotal,
          item.restock,
          item.condition
        ]
      );

      // Restore stock if restock flag is set
      if (item.restock) {
        await queryTenant(
          tenantSchema,
          'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
    }

    // Fetch return with items for the response
    const itemsResult = await queryTenant(
      tenantSchema,
      'SELECT * FROM return_items WHERE return_id = $1 ORDER BY id',
      [returnRecord.id]
    );

    res.status(201).json({
      success: true,
      message: 'Return processed successfully',
      data: {
        ...returnRecord,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Create return error:', error);
    next(error);
  }
};

/**
 * GET /returns
 * Paginated list of returns with optional date range filters.
 * Query params: page, limit, startDate, endDate
 */
exports.getAllReturns = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    await ensureReturnTables(tenantSchema);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`r.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`r.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const returnsResult = await queryTenant(
      tenantSchema,
      `SELECT r.*,
              u.full_name AS processed_by_name
       FROM returns r
       LEFT JOIN users u ON r.processed_by = u.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      `SELECT COUNT(*) FROM returns r ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: returnsResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get returns error:', error);
    next(error);
  }
};

/**
 * GET /returns/:returnId
 * Get a single return with its line items.
 */
exports.getReturnById = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { returnId } = req.params;

    await ensureReturnTables(tenantSchema);

    const returnResult = await queryTenant(
      tenantSchema,
      `SELECT r.*,
              u.full_name AS processed_by_name
       FROM returns r
       LEFT JOIN users u ON r.processed_by = u.id
       WHERE r.id = $1`,
      [returnId]
    );

    if (returnResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }

    const returnRecord = returnResult.rows[0];

    const itemsResult = await queryTenant(
      tenantSchema,
      'SELECT * FROM return_items WHERE return_id = $1 ORDER BY id',
      [returnId]
    );

    res.json({
      success: true,
      data: {
        ...returnRecord,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Get return error:', error);
    next(error);
  }
};

module.exports = exports;
