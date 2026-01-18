const { queryTenant } = require('../config/database');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Expense = require('../models/Expense');

/**
 * Get dashboard overview
 */
exports.getDashboardOverview = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's sales summary
    const todaySales = await Sale.getTodaySummary(tenantSchema);

    // Get low stock products
    const lowStockProducts = await Product.getLowStock(tenantSchema);

    // Get today's expenses
    const todayExpenses = await Expense.getTotalExpenses(
      tenantSchema,
      today,
      tomorrow
    );

    // Get active products count
    const productsResult = await queryTenant(
      tenantSchema,
      "SELECT COUNT(*) FROM products WHERE status = 'active'",
      []
    );

    // Get recent sales (last 10)
    const recentSalesResult = await queryTenant(
      tenantSchema,
      `SELECT s.*, u.full_name as cashier_name
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.id
       WHERE s.status = 'completed'
       ORDER BY s.created_at DESC
       LIMIT 10`,
      []
    );

    // Get payment method breakdown for today
    const paymentBreakdown = await Sale.getByPaymentMethod(
      tenantSchema,
      today,
      tomorrow
    );

    res.json({
      success: true,
      data: {
        sales: {
          todayTotal: parseFloat(todaySales.total_revenue) || 0,
          todayCount: parseInt(todaySales.total_sales) || 0,
          cashSales: parseFloat(todaySales.cash_sales) || 0,
          mpesaSales: parseFloat(todaySales.mpesa_sales) || 0,
          cardSales: parseFloat(todaySales.card_sales) || 0,
          vatCollected: parseFloat(todaySales.total_vat) || 0
        },
        expenses: {
          todayTotal: parseFloat(todayExpenses.total_amount) || 0,
          todayCount: parseInt(todayExpenses.total_count) || 0
        },
        inventory: {
          activeProducts: parseInt(productsResult.rows[0].count) || 0,
          lowStockCount: lowStockProducts.length
        },
        lowStockItems: lowStockProducts, // Added for notifications
        recentSales: recentSalesResult.rows,
        paymentBreakdown: paymentBreakdown
      }
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    next(error);
  }
};

/**
 * Get sales analytics
 */
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get sales report
    const salesReport = await Sale.getReport(tenantSchema, start, end);

    // Get top products
    const topProducts = await Sale.getTopProducts(tenantSchema, start, end);

    // Get payment method breakdown
    const paymentBreakdown = await Sale.getByPaymentMethod(tenantSchema, start, end);

    res.json({
      success: true,
      data: {
        salesReport,
        topProducts,
        paymentBreakdown
      }
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    next(error);
  }
};

/**
 * Get inventory alerts
 */
exports.getInventoryAlerts = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    // Get low stock products
    const lowStockProducts = await Product.getLowStock(tenantSchema);

    // Get out of stock products
    const outOfStockResult = await queryTenant(
      tenantSchema,
      `SELECT * FROM products
       WHERE stock_quantity = 0
       AND status = 'active'
       ORDER BY name ASC`,
      []
    );

    res.json({
      success: true,
      data: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockResult.rows
      }
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    next(error);
  }
};

/**
 * Get financial summary
 */
exports.getFinancialSummary = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get total revenue
    const revenueResult = await queryTenant(
      tenantSchema,
      `SELECT
        SUM(total_amount) as total_revenue,
        COUNT(*) as total_transactions
       FROM sales
       WHERE created_at BETWEEN $1 AND $2
       AND status = 'completed'`,
      [start, end]
    );

    // Get total expenses
    const expensesResult = await queryTenant(
      tenantSchema,
      `SELECT
        SUM(amount) as total_expenses,
        COUNT(*) as total_count
       FROM expenses
       WHERE expense_date BETWEEN $1 AND $2`,
      [start, end]
    );

    const revenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;
    const expenses = parseFloat(expensesResult.rows[0].total_expenses) || 0;
    const profit = revenue - expenses;

    res.json({
      success: true,
      data: {
        revenue,
        expenses,
        profit,
        transactions: parseInt(revenueResult.rows[0].total_transactions) || 0
      }
    });
  } catch (error) {
    console.error('Get financial summary error:', error);
    next(error);
  }
};

/**
 * Get hourly sales trend
 */
exports.getHourlySalesTrend = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await queryTenant(
      tenantSchema,
      `SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as sales_count,
        SUM(total_amount) as total_sales
       FROM sales
       WHERE created_at >= $1 AND created_at < $2
       AND status = 'completed'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [today, tomorrow]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get hourly sales trend error:', error);
    next(error);
  }
};
