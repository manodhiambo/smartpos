const crypto = require('crypto');

/**
 * Generate unique tenant schema name
 * @param {string} businessName - Business name
 * @returns {string} Schema name
 */
const generateTenantSchema = (businessName) => {
  const clean = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30);
  
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `tenant_${clean}_${randomSuffix}`;
};

/**
 * Generate unique receipt number
 * @param {string} prefix - Receipt prefix (default: RCP)
 * @returns {string} Receipt number
 */
const generateReceiptNumber = (prefix = 'RCP') => {
  const timestamp = Date.now().toString().slice(-8);
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Generate unique invoice number
 * @param {string} prefix - Invoice prefix (default: INV)
 * @returns {string} Invoice number
 */
const generateInvoiceNumber = (prefix = 'INV') => {
  const timestamp = Date.now().toString().slice(-8);
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Calculate VAT amount
 * @param {number} amount - Amount before VAT
 * @param {number} vatRate - VAT rate (default: 16%)
 * @returns {object} VAT breakdown
 */
const calculateVAT = (amount, vatRate = 16) => {
  const vatAmount = (amount * vatRate) / 100;
  const totalAmount = amount + vatAmount;
  
  return {
    baseAmount: parseFloat(amount.toFixed(2)),
    vatRate: vatRate,
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2))
  };
};

/**
 * Format currency (KES)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
const formatCurrency = (amount) => {
  return `KES ${parseFloat(amount).toLocaleString('en-KE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format phone number to Kenyan format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone
 */
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('254')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+254${cleaned.substring(1)}`;
  } else if (cleaned.length === 9) {
    return `+254${cleaned}`;
  }
  
  return phone;
};

/**
 * Generate random password
 * @param {number} length - Password length
 * @returns {string} Random password
 */
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '@$!%*?&'[Math.floor(Math.random() * 7)];
  
  // Fill remaining length
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Paginate results
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} Pagination details
 */
const paginate = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return {
    limit: parseInt(limit),
    offset: parseInt(offset),
    page: parseInt(page)
  };
};

/**
 * Calculate pagination metadata
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const paginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
};

/**
 * Calculate date range
 * @param {string} range - Range type (today, week, month, year)
 * @returns {object} Date range
 */
const getDateRange = (range = 'today') => {
  const now = new Date();
  let startDate, endDate;
  
  switch (range) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date();
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date();
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
  }
  
  return { startDate, endDate };
};

module.exports = {
  generateTenantSchema,
  generateReceiptNumber,
  generateInvoiceNumber,
  calculateVAT,
  formatCurrency,
  formatPhoneNumber,
  generateRandomPassword,
  paginate,
  paginationMeta,
  sanitizeFilename,
  getDateRange
};
