const express = require("express");
const router = express.Router();

// Import route modules
const donationRoutes = require("./donations");
const webhookRoutes = require("./webhooks");
const healthRoutes = require("./health");

// Mount routes WITHOUT /api prefix (it's added in app.js)
router.use("/donations", donationRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/health", healthRoutes);

// API root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Rockbridge Ministries Donations API",
    version: "1.0.0",
    endpoints: {
      donations: "/api/donations",
      webhooks: "/api/webhooks",
      health: "/api/health",
    },
  });
});

module.exports = router;
