const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

/**
 * Create new purchase
 */
exports.createPurchase = async (req, res, next) => {
  try {
    const { tenantSchema, id: userId } = req.user;
    const { supplierId, items, paymentMethod, amountPaid, notes } = req.body;

    // Validate supplier exists
    const supplier = await Supplier.findById(tenantSchema, supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Validate all products exist
    for (const item of items) {
      const product = await Product.findById(tenantSchema, item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitCost;
      const itemVat = (itemTotal * 16) / 116; // VAT inclusive

      item.totalCost = itemTotal;
      
      subtotal += itemTotal;
      totalVat += itemVat;
    });

    const totalCost = subtotal;

    const purchaseData = {
      supplierId,
      userId,
      items,
      subtotal,
      vatAmount: totalVat,
      totalCost,
      amountPaid: amountPaid || 0,
      paymentMethod,
      notes
    };

    const purchase = await Purchase.create(tenantSchema, purchaseData);

    res.status(201).json({
      success: true,
      message: 'Purchase recorded successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    next(error);
  }
};

/**
 * Get all purchases
 */
exports.getAllPurchases = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20, supplierId, startDate, endDate } = req.query;

    const filters = {};
    if (supplierId) filters.supplierId = supplierId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await Purchase.findAll(
      tenantSchema,
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      data: result.purchases,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    next(error);
  }
};

/**
 * Get purchase by ID
 */
exports.getPurchaseById = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const purchase = await Purchase.findById(tenantSchema, id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    next(error);
  }
};

/**
 * Make payment for purchase
 */
exports.makePayment = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const purchase = await Purchase.makePayment(tenantSchema, id, amount, paymentMethod);

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Make payment error:', error);
    next(error);
  }
};

/**
 * Get purchases summary
 */
exports.getPurchasesSummary = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const summary = await Purchase.getSummary(tenantSchema, startDate, endDate);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get purchases summary error:', error);
    next(error);
  }
};

module.exports = exports;
