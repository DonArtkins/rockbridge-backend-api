const moment = require("moment");

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Generate a unique receipt number
 * @returns {string} Unique receipt number
 */
const generateReceiptNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `RB${timestamp.slice(-6)}${random}`;
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Generate slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

/**
 * Calculate donation fee based on amount (Stripe fees)
 * @param {number} amount - Donation amount
 * @param {string} currency - Currency code
 * @returns {object} Fee breakdown
 */
const calculateDonationFee = (amount, currency = "USD") => {
  // Stripe fees: 2.9% + 30¢ for US cards
  const percentage = 0.029;
  const fixedFee = 0.3;

  const stripeFee = amount * percentage + fixedFee;
  const netAmount = amount - stripeFee;

  return {
    grossAmount: Number(amount.toFixed(2)),
    stripeFee: Number(stripeFee.toFixed(2)),
    netAmount: Number(netAmount.toFixed(2)),
    feePercentage: Number(((stripeFee / amount) * 100).toFixed(2)),
  };
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {string} format - Moment.js format string
 * @returns {string} Formatted date
 */
const formatDate = (date, format = "MMMM DD, YYYY") => {
  return moment(date).format(format);
};

/**
 * Get relative time (e.g., "2 days ago")
 * @param {Date} date - Date to compare
 * @returns {string} Relative time string
 */
const getRelativeTime = (date) => {
  return moment(date).fromNow();
};

/**
 * Validate and format phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} Validation result
 */
const validatePhone = (phone) => {
  if (!phone) return { isValid: false, formatted: null };

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Check if it's a valid length
  if (digits.length < 10 || digits.length > 15) {
    return { isValid: false, formatted: null };
  }

  // Format US phone numbers
  if (digits.length === 10) {
    const formatted = `(${digits.slice(0, 3)}) ${digits.slice(
      3,
      6
    )}-${digits.slice(6)}`;
    return { isValid: true, formatted };
  }

  // For international numbers, just add country code formatting
  if (digits.length === 11 && digits[0] === "1") {
    const formatted = `+1 (${digits.slice(1, 4)}) ${digits.slice(
      4,
      7
    )}-${digits.slice(7)}`;
    return { isValid: true, formatted };
  }

  return { isValid: true, formatted: `+${digits}` };
};

/**
 * Generate pagination info
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination info
 */
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
};

/**
 * Delay execution (for rate limiting, testing)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Round to 2 decimal places (for currency)
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
const roundToCurrency = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Check if date is within range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {boolean} True if date is within range
 */
const isDateInRange = (date, startDate, endDate) => {
  const checkDate = moment(date);
  return checkDate.isBetween(startDate, endDate, "day", "[]");
};

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const generateRandomString = (length = 10) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Parse sort parameter from query string
 * @param {string} sortParam - Sort parameter (e.g., "-createdAt,+amount")
 * @returns {object} MongoDB sort object
 */
const parseSortParam = (sortParam) => {
  if (!sortParam) return { createdAt: -1 };

  const sortObj = {};
  const sortFields = sortParam.split(",");

  sortFields.forEach((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith("-")) {
      sortObj[trimmed.substring(1)] = -1;
    } else if (trimmed.startsWith("+")) {
      sortObj[trimmed.substring(1)] = 1;
    } else {
      sortObj[trimmed] = 1;
    }
  });

  return sortObj;
};

module.exports = {
  formatCurrency,
  generateReceiptNumber,
  isValidEmail,
  sanitizeInput,
  generateSlug,
  calculateDonationFee,
  formatDate,
  getRelativeTime,
  validatePhone,
  getPaginationInfo,
  delay,
  roundToCurrency,
  isDateInRange,
  generateRandomString,
  parseSortParam,
};
