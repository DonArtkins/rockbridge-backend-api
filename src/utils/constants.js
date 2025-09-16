// Payment statuses
const PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELED: "canceled",
  REFUNDED: "refunded",
  REQUIRES_ACTION: "requires_action",
};

// Campaign statuses
const CAMPAIGN_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  PAUSED: "paused",
  DRAFT: "draft",
};

// Campaign categories
const CAMPAIGN_CATEGORIES = {
  EDUCATION: "education",
  HEALTHCARE: "healthcare",
  INFRASTRUCTURE: "infrastructure",
  EMERGENCY: "emergency",
  MISSIONS: "missions",
  YOUTH: "youth",
  GENERAL: "general",
};

// Donation frequencies
const RECURRING_FREQUENCIES = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  ANNUALLY: "annually",
};

// Dedication types
const DEDICATION_TYPES = {
  IN_HONOR: "in_honor",
  IN_MEMORY: "in_memory",
  NONE: "none",
};

// Donor types
const DONOR_TYPES = {
  FIRST_TIME: "first_time",
  RETURNING: "returning",
  RECURRING: "recurring",
  MAJOR_DONOR: "major_donor",
  CHAMPION: "champion",
};

// Currencies
const SUPPORTED_CURRENCIES = {
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  CAD: "CAD",
  AUD: "AUD",
};

// Countries
const SUPPORTED_COUNTRIES = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  NZ: "New Zealand",
};

// Donation limits
const DONATION_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 100000,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_DEDICATION_NAME_LENGTH: 100,
};

// Rate limiting
const RATE_LIMITS = {
  DONATION_WINDOW: 15 * 60 * 1000, // 15 minutes
  DONATION_MAX_ATTEMPTS: 5,
  GENERAL_WINDOW: 15 * 60 * 1000, // 15 minutes
  GENERAL_MAX_REQUESTS: 100,
};

// Email types
const EMAIL_TYPES = {
  RECEIPT: "receipt",
  THANK_YOU: "thank_you",
  ADMIN_NOTIFICATION: "admin_notification",
  TAX_RECEIPT: "tax_receipt",
};

// Webhook events
const STRIPE_WEBHOOK_EVENTS = {
  PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
  PAYMENT_INTENT_PAYMENT_FAILED: "payment_intent.payment_failed",
  PAYMENT_METHOD_ATTACHED: "payment_method.attached",
  INVOICE_PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  CUSTOMER_SUBSCRIPTION_CREATED: "customer.subscription.created",
  CUSTOMER_SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  CUSTOMER_SUBSCRIPTION_DELETED: "customer.subscription.deleted",
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error codes
const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PAYMENT_ERROR: "PAYMENT_ERROR",
  CAMPAIGN_NOT_FOUND: "CAMPAIGN_NOT_FOUND",
  CAMPAIGN_INACTIVE: "CAMPAIGN_INACTIVE",
  DONATION_NOT_FOUND: "DONATION_NOT_FOUND",
  STRIPE_ERROR: "STRIPE_ERROR",
  EMAIL_ERROR: "EMAIL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
};

// Environment types
const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  TEST: "test",
  STAGING: "staging",
  PRODUCTION: "production",
};

// Log levels
const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  HTTP: "http",
  VERBOSE: "verbose",
  DEBUG: "debug",
  SILLY: "silly",
};

// Database collections
const COLLECTIONS = {
  CAMPAIGNS: "campaigns",
  DONATIONS: "donations",
  DONORS: "donors",
};

// API response messages
const MESSAGES = {
  SUCCESS: {
    DONATION_CREATED: "Donation created successfully",
    PAYMENT_PROCESSED: "Payment processed successfully",
    CAMPAIGN_FETCHED: "Campaign retrieved successfully",
    EMAIL_SENT: "Email sent successfully",
  },
  ERROR: {
    INVALID_INPUT: "Invalid input provided",
    CAMPAIGN_NOT_FOUND: "Campaign not found",
    CAMPAIGN_INACTIVE: "Campaign is not active",
    PAYMENT_FAILED: "Payment processing failed",
    EMAIL_FAILED: "Failed to send email",
    RATE_LIMIT_EXCEEDED: "Too many requests, please try again later",
    INTERNAL_ERROR: "Internal server error occurred",
  },
};

// File upload limits
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  MAX_FILES: 10,
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Time constants
const TIME = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

module.exports = {
  PAYMENT_STATUS,
  CAMPAIGN_STATUS,
  CAMPAIGN_CATEGORIES,
  RECURRING_FREQUENCIES,
  DEDICATION_TYPES,
  DONOR_TYPES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_COUNTRIES,
  DONATION_LIMITS,
  RATE_LIMITS,
  EMAIL_TYPES,
  STRIPE_WEBHOOK_EVENTS,
  HTTP_STATUS,
  ERROR_CODES,
  ENVIRONMENTS,
  LOG_LEVELS,
  COLLECTIONS,
  MESSAGES,
  FILE_LIMITS,
  PAGINATION,
  TIME,
};
