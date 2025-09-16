const express = require("express");
const router = express.Router();

// Import route modules
const campaignRoutes = require("./campaigns");
const donationRoutes = require("./donations");
const paymentRoutes = require("./payments");
const webhookRoutes = require("./webhooks");
const healthRoutes = require("./health");

// Health check routes (no /api prefix)
router.use("/health", healthRoutes);

// API routes with /api prefix
router.use("/api/campaigns", campaignRoutes);
router.use("/api/donations", donationRoutes);
router.use("/api/payments", paymentRoutes);
router.use("/api/webhooks", webhookRoutes);

// API root endpoint
router.get("/api", (req, res) => {
  res.json({
    message: "Rockbridge Ministries Donations API",
    version: "1.0.0",
    documentation: "/api-docs",
    endpoints: {
      campaigns: "/api/campaigns",
      donations: "/api/donations",
      payments: "/api/payments",
      webhooks: "/api/webhooks",
      health: "/health",
    },
  });
});

// Catch 404 for API routes
router.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

module.exports = router;
