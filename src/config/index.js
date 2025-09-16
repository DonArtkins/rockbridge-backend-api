const { testStripeConnection } = require("./stripe");
const { testEmailConnection } = require("./email");
const logger = require("../utils/logger");

// Initialize all services
const initializeServices = async () => {
  try {
    logger.info("🔧 Initializing services...");

    // Test Stripe connection
    await testStripeConnection();

    // Test email connection
    await testEmailConnection();

    logger.info("✅ All services initialized successfully");
  } catch (error) {
    logger.error("❌ Service initialization failed:", error);
    throw error;
  }
};

// Application configuration
const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || "http://localhost:3001",

  // Rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS origins
  corsOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:3000", "http://localhost:3001"],

  // Request timeout
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,

  // File upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
};

module.exports = {
  config,
  initializeServices,
};
