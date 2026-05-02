const { queryTenant, queryMain } = require('../config/database');

// Adjustment types that reduce stock (applied as negative deltas)
const NEGATIVE_ADJUSTMENT_TYPES = new Set(['wastage', 'damage', 'theft', 'expiry']);
// Adjustment types that increase stock (applied as positive deltas)
const POSITIVE_ADJUSTMENT_TYPES = new Set(['found', 'count_correction']);
const ALL_ADJUSTMENT_TYPES = new Set([...NEGATIVE_ADJUSTMENT_TYPES, ...POSITIVE_ADJUSTMENT_TYPES]);

/**
 * Ensure the stock_adjustments table exists in the tenant schema.
 */
async function ensureAdjustmentsTable(tenantSchema) {
  await queryMain(`CREATE TABLE IF NOT EXISTS "${tenantSchema}".stock_adjustments (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL,
    quantity_before DECIMAL(10,3) NOT NULL,
    quantity_adjusted DECIMAL(10,3) NOT NULL,
    quantity_after DECIMAL(10,3) NOT NULL,
    cost_impact DECIMAL(10,2) DEFAULT 0,
    reason TEXT,
    adjusted_by INTEGER,
    reference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

/**
 * Generate a reference number: ADJ-YYYYMMDD-XXXX
 */
async function generateReference(tenantSchema) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const countResult = await queryTenant(
    tenantSchema,
    `SELECT COUNT(*) FROM stock_adjustments
     WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'`
  );
  const count = parseInt(countResult.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `ADJ-${datePart}-${seq}`;
}

/**
 * POST /stock-adjustments
 * Create a new stock adjustment.
 * Body: { productId, adjustmentType, quantityAdjusted, reason }
 */
exports.createAdjustment = async (req, res, next) => {
  try {
    const { tenantSchema, id: adjustedBy } = req.user;
    const { productId, adjustmentType, quantityAdjusted, reason } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    if (!adjustmentType || !ALL_ADJUSTMENT_TYPES.has(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: `adjustmentType must be one of: ${[...ALL_ADJUSTMENT_TYPES].join(', ')}`
      });
    }

    const parsedQty = parseFloat(quantityAdjusted);
    if (isNaN(parsedQty) || parsedQty === 0) {
      return res.status(400).json({
        success: false,
        message: 'quantityAdjusted must be a non-zero number'
      });
    }

    await ensureAdjustmentsTable(tenantSchema);

    // Fetch the product
    const productResult = await queryTenant(
      tenantSchema,
      'SELECT id, name, stock_quantity, cost_price FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
    }

    const product = productResult.rows[0];
    const quantityBefore = parseFloat(product.stock_quantity);
    const costPrice = parseFloat(product.cost_price) || 0;

    // Determine the signed delta.
    // For unambiguous reduce types always reduce; for bidirectional types honour the sign sent.
    let delta;
    if (NEGATIVE_ADJUSTMENT_TYPES.has(adjustmentType)) {
      delta = -Math.abs(parsedQty);
    } else {
      delta = parsedQty; // negative value = reduce, positive = increase
    }

    const quantityAfter = quantityBefore + delta;

    // Prevent stock from going negative for reduction types
    if (quantityAfter < 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce stock below zero. Current stock: ${quantityBefore}, requested reduction: ${parsedQty}`
      });
    }

    const costImpact = Math.abs(delta) * costPrice;
    const reference = await generateReference(tenantSchema);

    // Update the product stock
    await queryTenant(
      tenantSchema,
      'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [quantityAfter, productId]
    );

    // Record the adjustment
    const adjustmentResult = await queryTenant(
      tenantSchema,
      `INSERT INTO stock_adjustments (
        product_id, product_name, adjustment_type,
        quantity_before, quantity_adjusted, quantity_after,
        cost_impact, reason, adjusted_by, reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        productId,
        product.name,
        adjustmentType,
        quantityBefore,
        delta,   // signed: negative for reductions, positive for increases
        quantityAfter,
        costImpact,
        reason || null,
        adjustedBy,
        reference
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Stock adjustment recorded successfully',
      data: adjustmentResult.rows[0]
    });
  } catch (error) {
    console.error('Create stock adjustment error:', error);
    next(error);
  }
};

/**
 * GET /stock-adjustments
 * Paginated list with optional filters by type and date range.
 * Query params: page, limit, adjustmentType, startDate, endDate
 */
exports.getAllAdjustments = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20, adjustmentType: _at, type: _t, startDate, endDate } = req.query;
    const adjustmentType = _at || _t;

    await ensureAdjustmentsTable(tenantSchema);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (adjustmentType) {
      conditions.push(`sa.adjustment_type = $${paramIndex++}`);
      params.push(adjustmentType);
    }

    if (startDate) {
      conditions.push(`sa.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`sa.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const adjustmentsResult = await queryTenant(
      tenantSchema,
      `SELECT sa.*,
              u.full_name AS adjusted_by_name
       FROM stock_adjustments sa
       LEFT JOIN public.tenant_users u ON sa.adjusted_by = u.id
       ${whereClause}
       ORDER BY sa.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      `SELECT COUNT(*) FROM stock_adjustments sa ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: adjustmentsResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get adjustments error:', error);
    next(error);
  }
};

/**
 * GET /stock-adjustments/product/:productId
 * All adjustments for a specific product.
 */
exports.getAdjustmentsByProduct = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { productId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    await ensureAdjustmentsTable(tenantSchema);

    // Verify product exists
    const productResult = await queryTenant(
      tenantSchema,
      'SELECT id, name, stock_quantity FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
    }

    const product = productResult.rows[0];
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const adjustmentsResult = await queryTenant(
      tenantSchema,
      `SELECT sa.*,
              u.full_name AS adjusted_by_name
       FROM stock_adjustments sa
       LEFT JOIN public.tenant_users u ON sa.adjusted_by = u.id
       WHERE sa.product_id = $1
       ORDER BY sa.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parseInt(limit), offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      'SELECT COUNT(*) FROM stock_adjustments WHERE product_id = $1',
      [productId]
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          currentStock: parseFloat(product.stock_quantity)
        },
        adjustments: adjustmentsResult.rows
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get product adjustments error:', error);
    next(error);
  }
};

module.exports = exports;
