const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware wrapper
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Log validation errors for debugging
    console.log('Validation Errors:', JSON.stringify(errors.array(), null, 2));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  };
};

/**
 * Tenant registration validation
 */
const validateTenantRegistration = validate([
  body('businessName')
    .trim()
    .notEmpty().withMessage('Business name is required')
    .isLength({ min: 3, max: 255 }).withMessage('Business name must be 3-255 characters'),

  body('businessEmail')
    .trim()
    .notEmpty().withMessage('Business email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('businessPhone')
    .trim()
    .notEmpty().withMessage('Business phone is required')
    .matches(/^(\+254|0)[17]\d{8}$/).withMessage('Invalid Kenyan phone number'),

  body('businessAddress')
    .trim()
    .notEmpty().withMessage('Business address is required'),

  body('adminUsername')
    .trim()
    .notEmpty().withMessage('Admin username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

  body('adminPassword')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  body('adminFullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 3, max: 255 }).withMessage('Full name must be 3-255 characters'),
]);

/**
 * Login validation
 */
const validateLogin = validate([
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),

  body('password')
    .notEmpty().withMessage('Password is required'),
]);

/**
 * Normalize product fields middleware
 */
const normalizeProductFields = (req, res, next) => {
  if (req.body.cost_price !== undefined) req.body.costPrice = req.body.cost_price;
  if (req.body.selling_price !== undefined) req.body.sellingPrice = req.body.selling_price;
  if (req.body.wholesale_price !== undefined) req.body.wholesalePrice = req.body.wholesale_price;
  if (req.body.vat_type !== undefined) req.body.vatType = req.body.vat_type;
  if (req.body.unit_of_measure !== undefined) req.body.unitOfMeasure = req.body.unit_of_measure;
  if (req.body.stock_quantity !== undefined) req.body.stockQuantity = req.body.stock_quantity;
  if (req.body.reorder_level !== undefined) req.body.reorderLevel = req.body.reorder_level;
  if (req.body.expiry_tracking !== undefined) req.body.expiryTracking = req.body.expiry_tracking;
  next();
};

/**
 * Product validation - accepts both camelCase and snake_case
 */
const validateProduct = [
  normalizeProductFields,
  validate([
    body('name')
      .trim()
      .notEmpty().withMessage('Product name is required')
      .isLength({ max: 255 }).withMessage('Product name too long'),

    body('barcode')
      .trim()
      .notEmpty().withMessage('Barcode is required')
      .isLength({ min: 3, max: 50 }).withMessage('Barcode must be 3-50 characters'),

    body('category')
      .trim()
      .notEmpty().withMessage('Category is required'),

    body('costPrice')
      .isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),

    body('sellingPrice')
      .isFloat({ min: 0 }).withMessage('Selling price must be a positive number')
      .custom((value, { req }) => {
        if (parseFloat(value) < parseFloat(req.body.costPrice)) {
          throw new Error('Selling price cannot be less than cost price');
        }
        return true;
      }),

    body('vatType')
      .isIn(['vatable', 'zero_rated', 'exempt']).withMessage('Invalid VAT type'),

    body('stockQuantity')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock quantity must be a positive integer'),
  ])
];

/**
 * Sale validation
 */
const validateSale = validate([
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),

  body('items.*.productId')
    .isInt({ min: 1 }).withMessage('Invalid product ID'),

  body('items.*.quantity')
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),

  body('items.*.price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be positive'),

  body('paymentMethod')
    .isIn(['cash', 'mpesa', 'card', 'bank_transfer', 'credit']).withMessage('Invalid payment method'),

  body('totalAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Total amount must be positive'),

  body('amountPaid')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount paid must be positive'),
]);

/**
 * User validation
 */
const validateUser = validate([
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required'),

  body('role')
    .isIn(['admin', 'manager', 'cashier', 'storekeeper']).withMessage('Invalid role'),

  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
]);

module.exports = {
  validate,
  validateTenantRegistration,
  validateLogin,
  validateProduct,
  normalizeProductFields,
  validateSale,
  validateUser
};
