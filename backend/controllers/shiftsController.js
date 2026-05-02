const { queryTenant, queryMain } = require('../config/database');

/**
 * Ensure the shifts table exists in the tenant schema.
 */
async function ensureShiftsTable(tenantSchema) {
  await queryMain(`CREATE TABLE IF NOT EXISTS "${tenantSchema}".shifts (
    id SERIAL PRIMARY KEY,
    shift_no VARCHAR(30) UNIQUE,
    opened_by INTEGER,
    closed_by INTEGER,
    opening_float DECIMAL(10,2) DEFAULT 0,
    closing_cash DECIMAL(10,2),
    expected_cash DECIMAL(10,2),
    cash_variance DECIMAL(10,2),
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open',
    notes TEXT,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
  )`);
}

/**
 * Generate a shift number: SHF-YYYYMMDD-XX
 */
async function generateShiftNo(tenantSchema) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const countResult = await queryTenant(
    tenantSchema,
    `SELECT COUNT(*) FROM shifts
     WHERE opened_at >= CURRENT_DATE AND opened_at < CURRENT_DATE + INTERVAL '1 day'`
  );
  const count = parseInt(countResult.rows[0].count) + 1;
  const seq = String(count).padStart(2, '0');
  return `SHF-${datePart}-${seq}`;
}

/**
 * POST /shifts/open
 * Open a new shift.
 * Body: { openingFloat, notes }
 */
exports.openShift = async (req, res, next) => {
  try {
    const { tenantSchema, id: openedBy } = req.user;
    const { openingFloat = 0, notes } = req.body;

    await ensureShiftsTable(tenantSchema);

    // Check if there is already an open shift
    const openShiftResult = await queryTenant(
      tenantSchema,
      "SELECT id, shift_no FROM shifts WHERE status = 'open' LIMIT 1"
    );

    if (openShiftResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A shift is already open (${openShiftResult.rows[0].shift_no}). Close it before opening a new one.`
      });
    }

    const shiftNo = await generateShiftNo(tenantSchema);

    const result = await queryTenant(
      tenantSchema,
      `INSERT INTO shifts (shift_no, opened_by, opening_float, status, notes)
       VALUES ($1, $2, $3, 'open', $4)
       RETURNING *`,
      [shiftNo, openedBy, parseFloat(openingFloat), notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Shift opened successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Open shift error:', error);
    next(error);
  }
};

/**
 * POST /shifts/:shiftId/close
 * Close the current open shift.
 * Body: { closingCash, notes }
 */
exports.closeShift = async (req, res, next) => {
  try {
    const { tenantSchema, id: closedBy } = req.user;
    const { shiftId } = req.params;
    const { closingCash, notes } = req.body;

    await ensureShiftsTable(tenantSchema);

    if (closingCash === undefined || closingCash === null) {
      return res.status(400).json({
        success: false,
        message: 'Closing cash amount is required'
      });
    }

    // Fetch the shift
    const shiftResult = await queryTenant(
      tenantSchema,
      "SELECT * FROM shifts WHERE id = $1 AND status = 'open'",
      [shiftId]
    );

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Open shift not found'
      });
    }

    const shift = shiftResult.rows[0];

    // Calculate totals from sales made during this shift
    const salesResult = await queryTenant(
      tenantSchema,
      `SELECT
         COALESCE(SUM(total_amount), 0) AS total_sales,
         COUNT(*) AS total_transactions
       FROM sales
       WHERE created_at >= $1
         AND created_at <= CURRENT_TIMESTAMP
         AND status = 'completed'`,
      [shift.opened_at]
    );

    const totalSales = parseFloat(salesResult.rows[0].total_sales);
    const totalTransactions = parseInt(salesResult.rows[0].total_transactions);

    // Cash sales total for expected cash calculation
    const cashSalesResult = await queryTenant(
      tenantSchema,
      `SELECT COALESCE(SUM(total_amount), 0) AS cash_total
       FROM sales
       WHERE created_at >= $1
         AND created_at <= CURRENT_TIMESTAMP
         AND status = 'completed'
         AND payment_method = 'cash'`,
      [shift.opened_at]
    );

    const cashSalesTotal = parseFloat(cashSalesResult.rows[0].cash_total);
    const openingFloat = parseFloat(shift.opening_float);
    const expectedCash = openingFloat + cashSalesTotal;
    const cashVariance = parseFloat(closingCash) - expectedCash;

    const updateResult = await queryTenant(
      tenantSchema,
      `UPDATE shifts
       SET status = 'closed',
           closed_by = $1,
           closing_cash = $2,
           expected_cash = $3,
           cash_variance = $4,
           total_sales = $5,
           total_transactions = $6,
           notes = COALESCE($7, notes),
           closed_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        closedBy,
        parseFloat(closingCash),
        expectedCash,
        cashVariance,
        totalSales,
        totalTransactions,
        notes || null,
        shiftId
      ]
    );

    res.json({
      success: true,
      message: 'Shift closed successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Close shift error:', error);
    next(error);
  }
};

/**
 * GET /shifts/current
 * Get the currently open shift with opener's name.
 */
exports.getCurrentShift = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    await ensureShiftsTable(tenantSchema);

    const result = await queryTenant(
      tenantSchema,
      `SELECT s.*,
              u.full_name AS opened_by_name
       FROM shifts s
       LEFT JOIN users u ON s.opened_by = u.id
       WHERE s.status = 'open'
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No shift is currently open'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get current shift error:', error);
    next(error);
  }
};

/**
 * GET /shifts
 * Paginated list of all shifts.
 * Query params: page, limit
 */
exports.getAllShifts = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20 } = req.query;

    await ensureShiftsTable(tenantSchema);

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const shiftsResult = await queryTenant(
      tenantSchema,
      `SELECT s.*,
              uo.full_name AS opened_by_name,
              uc.full_name AS closed_by_name
       FROM shifts s
       LEFT JOIN users uo ON s.opened_by = uo.id
       LEFT JOIN users uc ON s.closed_by = uc.id
       ORDER BY s.opened_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const countResult = await queryTenant(
      tenantSchema,
      'SELECT COUNT(*) FROM shifts'
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: shiftsResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all shifts error:', error);
    next(error);
  }
};

/**
 * GET /shifts/:shiftId/summary
 * Detailed summary for a shift including sales by payment method and top products.
 */
exports.getShiftSummary = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { shiftId } = req.params;

    await ensureShiftsTable(tenantSchema);

    // Fetch the shift
    const shiftResult = await queryTenant(
      tenantSchema,
      `SELECT s.*,
              uo.full_name AS opened_by_name,
              uc.full_name AS closed_by_name
       FROM shifts s
       LEFT JOIN users uo ON s.opened_by = uo.id
       LEFT JOIN users uc ON s.closed_by = uc.id
       WHERE s.id = $1`,
      [shiftId]
    );

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    const shift = shiftResult.rows[0];
    // For open shifts, the effective end is now; for closed shifts, use closed_at
    const rangeEnd = shift.closed_at || new Date().toISOString();

    // Sales breakdown by payment method
    const paymentBreakdownResult = await queryTenant(
      tenantSchema,
      `SELECT payment_method,
              COUNT(*) AS transaction_count,
              COALESCE(SUM(total_amount), 0) AS total_amount
       FROM sales
       WHERE created_at >= $1
         AND created_at <= $2
         AND status = 'completed'
       GROUP BY payment_method
       ORDER BY total_amount DESC`,
      [shift.opened_at, rangeEnd]
    );

    // Top 10 products sold during the shift
    const topProductsResult = await queryTenant(
      tenantSchema,
      `SELECT si.product_id,
              si.product_name,
              SUM(si.quantity) AS total_quantity,
              SUM(si.subtotal) AS total_revenue
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       WHERE s.created_at >= $1
         AND s.created_at <= $2
         AND s.status = 'completed'
       GROUP BY si.product_id, si.product_name
       ORDER BY total_revenue DESC
       LIMIT 10`,
      [shift.opened_at, rangeEnd]
    );

    // Hourly sales for the shift
    const hourlySalesResult = await queryTenant(
      tenantSchema,
      `SELECT DATE_TRUNC('hour', created_at) AS hour,
              COUNT(*) AS transaction_count,
              COALESCE(SUM(total_amount), 0) AS total_amount
       FROM sales
       WHERE created_at >= $1
         AND created_at <= $2
         AND status = 'completed'
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour`,
      [shift.opened_at, rangeEnd]
    );

    res.json({
      success: true,
      data: {
        shift,
        paymentBreakdown: paymentBreakdownResult.rows,
        topProducts: topProductsResult.rows,
        hourlySales: hourlySalesResult.rows
      }
    });
  } catch (error) {
    console.error('Get shift summary error:', error);
    next(error);
  }
};

module.exports = exports;
