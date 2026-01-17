/**
 * Format currency to KES
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'KES 0.00';
  return `KES ${parseFloat(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format number with commas
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  return parseInt(number).toLocaleString('en-KE');
};

/**
 * Format date
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format time only
 */
export const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return ((value / total) * 100).toFixed(2);
};

/**
 * Calculate VAT (16%)
 */
export const calculateVAT = (amount, inclusive = true) => {
  if (inclusive) {
    // VAT inclusive - extract VAT from total
    const vatAmount = (amount * 16) / 116;
    return {
      baseAmount: amount - vatAmount,
      vatAmount: vatAmount,
      totalAmount: amount
    };
  } else {
    // VAT exclusive - add VAT to amount
    const vatAmount = (amount * 16) / 100;
    return {
      baseAmount: amount,
      vatAmount: vatAmount,
      totalAmount: amount + vatAmount
    };
  }
};

/**
 * Generate receipt number
 */
export const generateReceiptNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP${timestamp}${random}`;
};

/**
 * Validate Kenyan phone number
 */
export const validateKenyanPhone = (phone) => {
  const regex = /^(\+254|0)[17]\d{8}$/;
  return regex.test(phone);
};

/**
 * Format Kenyan phone number
 */
export const formatKenyanPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Convert to +254 format
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
 * Truncate text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Debounce function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Download file
 */
export const downloadFile = (data, filename, type = 'text/csv') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Get date range for filters
 */
export const getDateRange = (range) => {
  const now = new Date();
  let startDate, endDate;

  switch (range) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'yesterday':
      startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
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

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

/**
 * Check if date is today
 */
export const isToday = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Get time ago string
 */
export const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateString);
};

/**
 * Validate barcode
 */
export const validateBarcode = (barcode) => {
  if (!barcode) return false;
  const cleaned = barcode.trim();
  return cleaned.length >= 8 && cleaned.length <= 50;
};

/**
 * Sort array by key
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

/**
 * Group array by key
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Get random color
 */
export const getRandomColor = () => {
  const colors = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Calculate profit margin
 */
export const calculateProfitMargin = (cost, selling) => {
  if (!cost || cost === 0) return 0;
  return (((selling - cost) / cost) * 100).toFixed(2);
};

/**
 * Check if stock is low
 */
export const isLowStock = (quantity, reorderLevel) => {
  return quantity <= reorderLevel;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
};

export default {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatTime,
  calculatePercentage,
  calculateVAT,
  generateReceiptNumber,
  validateKenyanPhone,
  formatKenyanPhone,
  truncateText,
  getInitials,
  debounce,
  downloadFile,
  getDateRange,
  copyToClipboard,
  isToday,
  timeAgo,
  validateBarcode,
  sortBy,
  groupBy,
  getRandomColor,
  calculateProfitMargin,
  isLowStock,
  formatFileSize
};
