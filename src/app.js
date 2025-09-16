const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");

// Import middlewares
const { requestLogger } = require("./middlewares/logging");
const corsConfig = require("./middlewares/cors");
const errorHandler = require("./middlewares/errorHandler");
const securityMiddleware = require("./middlewares/security");

// Import routes
const routes = require("./routes");

const app = express();

// Trust proxy (for accurate IP addresses behind load balancers)
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// Basic security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com"],
        connectSrc: ["'self'", "api.stripe.com"],
        frameSrc: ["js.stripe.com", "hooks.stripe.com"],
      },
    },
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security middleware
app.use(mongoSanitize());
app.use(securityMiddleware);

// CORS configuration
app.use(cors(corsConfig));

// Request logging
app.use(requestLogger);

// Health check endpoint (before rate limiting for monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
  });
});

// API routes
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🙏 Rockbridge Ministries Donation API",
    version: "1.0.0",
    status: "active",
    endpoints: {
      health: "/health",
      api: "/api",
      docs: "/api/docs",
    },
  });
});

// Handle 404s
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      "GET /health",
      "GET /api/campaigns",
      "POST /api/donations/intent",
      "POST /api/donations/confirm",
      "POST /api/webhooks/stripe",
    ],
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
