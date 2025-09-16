const express = require("express");
const router = express.Router();
const donationController = require("../controllers/donationController");
const { validate, schemas } = require("../middlewares/validation");

// Create donation payment intent
router.post(
  "/intent",
  validate(schemas.createDonation),
  donationController.createDonationIntent
);

// Confirm donation after payment
router.post(
  "/confirm",
  validate(schemas.confirmDonation),
  donationController.confirmDonation
);

// Get recent donations (public)
router.get("/recent", donationController.getRecentDonations);

// Get donation by ID
router.get(
  "/:id",
  validate(schemas.mongoId, "params"),
  donationController.getDonationById
);

// Admin routes (these would need authentication middleware when you implement it)
// Get all donations (admin only)
router.get(
  "/",
  validate(schemas.donationQuery, "query"),
  donationController.getDonations
);

// Get donation analytics (admin only)
router.get("/analytics/summary", donationController.getDonationAnalytics);

module.exports = router;
