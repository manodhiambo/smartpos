const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

/**
 * Create new sale
 */
exports.createSale = async (req, res, next) => {
  try {
    const { tenantSchema, id: cashierId } = req.user;
    const { items, customerId, discount, paymentMethod, amountPaid, mpesaCode, notes } = req.body;

    // Validate stock availability for all items
    for (const item of items) {
      const product = await Product.findById(tenantSchema, item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`
        });
      }

      // Add product details to item
      item.productName = product.name;
      item.unitPrice = product.selling_price;
    }

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;

    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      let itemVat = 0;

      // Get product to check VAT type
      const product = items.find(p => p.productId === item.productId);
      
      // Calculate VAT (16% for vatable items)
      if (product && product.vatType === 'vatable') {
        itemVat = (itemSubtotal * 16) / 116; // VAT inclusive calculation
      }

      item.subtotal = itemSubtotal;
      item.vatAmount = itemVat;
      item.total = itemSubtotal;
      item.discount = 0;

      subtotal += itemSubtotal;
      totalVat += itemVat;
    });

    const discountAmount = discount || 0;
    const totalAmount = subtotal - discountAmount;
    const changeAmount = (amountPaid || totalAmount) - totalAmount;

    const saleData = {
      cashierId,
      customerId: customerId || null,
      items,
      subtotal,
      vatAmount: totalVat,
      discount: discountAmount,
      totalAmount,
      paymentMethod,
      amountPaid: amountPaid || totalAmount,
      changeAmount: changeAmount > 0 ? changeAmount : 0,
      mpesaCode,
      notes
    };

    const sale = await Sale.create(tenantSchema, saleData);

    // Update customer loyalty points if customer is provided
    if (customerId) {
      const loyaltyPoints = Math.floor(totalAmount / 100); // 1 point per 100 KES
      await Customer.updateLoyaltyPoints(tenantSchema, customerId, loyaltyPoints, 'add');
    }

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: sale
    });
  } catch (error) {
    console.error('Create sale error:', error);
    next(error);
  }
};

/**
 * Get all sales
 */
exports.getAllSales = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20, cashierId, paymentMethod, startDate, endDate } = req.query;

    const filters = {};
    if (cashierId) filters.cashierId = cashierId;
    if (paymentMethod) filters.paymentMethod = paymentMethod;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await Sale.findAll(
      tenantSchema,
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      data: result.sales,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get sales error:', error);
    next(error);
  }
};

/**
 * Get sale by ID
 */
exports.getSaleById = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const sale = await Sale.findById(tenantSchema, id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Get sale error:', error);
    next(error);
  }
};

/**
 * Get sale by receipt number
 */
exports.getSaleByReceipt = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { receiptNo } = req.params;

    const sale = await Sale.findByReceiptNo(tenantSchema, receiptNo);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Get sale by receipt error:', error);
    next(error);
  }
};

/**
 * Get today's sales summary
 */
exports.getTodaySummary = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const summary = await Sale.getTodaySummary(tenantSchema);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get today summary error:', error);
    next(error);
  }
};

/**
 * Get sales report
 */
exports.getSalesReport = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const report = await Sale.getReport(tenantSchema, startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    next(error);
  }
};

/**
 * Get top selling products
 */
exports.getTopProducts = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { limit = 10, startDate, endDate } = req.query;

    const products = await Sale.getTopProducts(
      tenantSchema,
      parseInt(limit),
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get top products error:', error);
    next(error);
  }
};

/**
 * Get cashier performance
 */
exports.getCashierPerformance = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const performance = await Sale.getCashierPerformance(tenantSchema, startDate, endDate);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Get cashier performance error:', error);
    next(error);
  }
};

/**
 * Get sales by payment method
 */
exports.getSalesByPaymentMethod = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const breakdown = await Sale.getByPaymentMethod(tenantSchema, startDate, endDate);

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Get payment method breakdown error:', error);
    next(error);
  }
};

/**
 * Void/Cancel sale
 */
exports.voidSale = async (req, res, next) => {
  try {
    const { tenantSchema, id: userId, role } = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    // Only admin and manager can void sales
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to void sales'
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Reason for voiding sale is required (minimum 5 characters)'
      });
    }

    const sale = await Sale.void(tenantSchema, id, reason, userId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      message: 'Sale voided successfully',
      data: sale
    });
  } catch (error) {
    console.error('Void sale error:', error);
    next(error);
  }
};

module.exports = exports;
