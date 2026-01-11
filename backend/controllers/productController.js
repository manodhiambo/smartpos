const Product = require('../models/Product');

/**
 * Create new product
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    // Check if barcode already exists
    const existingProduct = await Product.findByBarcode(tenantSchema, req.body.barcode);
    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: 'Product with this barcode already exists'
      });
    }

    const product = await Product.create(tenantSchema, req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    next(error);
  }
};

/**
 * Get all products
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { page = 1, limit = 20, category, lowStock } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (lowStock === 'true') filters.lowStock = true;

    const result = await Product.findAll(
      tenantSchema,
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get products error:', error);
    next(error);
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const product = await Product.findById(tenantSchema, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    next(error);
  }
};

/**
 * Get product by barcode
 */
exports.getProductByBarcode = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { barcode } = req.params;

    const product = await Product.findByBarcode(tenantSchema, barcode);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product by barcode error:', error);
    next(error);
  }
};

/**
 * Search products
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }

    const result = await Product.search(
      tenantSchema,
      q,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Search products error:', error);
    next(error);
  }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await Product.findById(tenantSchema, id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // If barcode is being changed, check uniqueness
    if (req.body.barcode && req.body.barcode !== existingProduct.barcode) {
      const barcodeExists = await Product.barcodeExists(tenantSchema, req.body.barcode, id);
      if (barcodeExists) {
        return res.status(409).json({
          success: false,
          message: 'Barcode already in use by another product'
        });
      }
    }

    const product = await Product.update(tenantSchema, id, req.body);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    next(error);
  }
};

/**
 * Delete product
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;
    const { id } = req.params;

    const product = await Product.delete(tenantSchema, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    next(error);
  }
};

/**
 * Get low stock products
 */
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const products = await Product.getLowStock(tenantSchema);

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    next(error);
  }
};

/**
 * Get product categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { tenantSchema } = req.user;

    const categories = await Product.getCategories(tenantSchema);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    next(error);
  }
};

module.exports = exports;
