const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');
const { queryTenant } = require('../config/database');

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

    // Get low stock count
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
    const { period = 'week' } = req.query; // week, month, year

    let startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get daily sales breakdown
    const salesReport = await Sale.getReport(tenantSchema, startDate, endDate);

    // Get top products
    const topProducts = await Sale.getTopProducts(tenantSchema, 10, startDate, endDate);

    // Get cashier performance
    const cashierPerformance = await Sale.getCashierPerformance(
      tenantSchema,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        salesByDay: salesReport,
        topProducts,
        cashierPerformance
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
    const lowStock = await Product.getLowStock(tenantSchema);

    // Get out of stock products
    const outOfStockResult = await queryTenant(
      tenantSchema,
      `SELECT * FROM products 
       WHERE stock_quantity <= 0 AND status = 'active'
       ORDER BY name`,
      []
    );

    // Get negative stock (error condition)
    const negativeStockResult = await queryTenant(
      tenantSchema,
      `SELECT * FROM products 
       WHERE stock_quantity < 0 AND status = 'active'
       ORDER BY stock_quantity`,
      []
    );

    res.json({
      success: true,
      data: {
        lowStock: lowStock,
        outOfStock: outOfStockResult.rows,
        negativeStock: negativeStockResult.rows,
        alerts: {
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStockResult.rows.length,
          negativeStockCount: negativeStockResult.rows.length
        }
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

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Get sales summary
    const salesResult = await queryTenant(
      tenantSchema,
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(vat_amount), 0) as vat_collected
       FROM sales
       WHERE created_at >= $1 AND created_at <= $2
       AND status = 'completed'`,
      [startDate, endDate]
    );

    // Get purchases summary
    const purchasesSummary = await Purchase.getSummary(tenantSchema, startDate, endDate);

    // Get expenses summary
    const expensesSummary = await Expense.getTotalExpenses(tenantSchema, startDate, endDate);

    // Calculate profit (simplified)
    const revenue = parseFloat(salesResult.rows[0].total_revenue) || 0;
    const purchases = parseFloat(purchasesSummary.total_cost) || 0;
    const expenses = parseFloat(expensesSummary.total_amount) || 0;
    const grossProfit = revenue - purchases;
    const netProfit = grossProfit - expenses;

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        revenue: {
          total: revenue,
          transactions: parseInt(salesResult.rows[0].total_transactions) || 0,
          vatCollected: parseFloat(salesResult.rows[0].vat_collected) || 0
        },
        purchases: {
          total: purchases,
          paid: parseFloat(purchasesSummary.total_paid) || 0,
          balance: parseFloat(purchasesSummary.total_balance) || 0
        },
        expenses: {
          total: expenses,
          count: parseInt(expensesSummary.total_count) || 0
        },
        profit: {
          gross: grossProfit,
          net: netProfit,
          margin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get financial summary error:', error);
    next(error);
  }
};

/**
 * Get hourly sales trend (for today)
 */
exports.getHourlySalesTrend = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const result = await queryTenant(
      tenantSchema,
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as transactions,
        SUM(total_amount) as revenue
       FROM sales
       WHERE DATE(created_at) = CURRENT_DATE
       AND status = 'completed'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      []
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

module.exports = exports;
