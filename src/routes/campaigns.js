const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const { validate, schemas } = require("../middlewares/validation");

// Get all campaigns with filtering and pagination
router.get(
  "/",
  validate(schemas.campaignQuery, "query"),
  campaignController.getAllCampaigns
);

// Get featured campaigns
router.get("/featured", campaignController.getFeaturedCampaigns);

// Get campaign by slug (this should come before /:id to avoid conflicts)
router.get(
  "/:slug",
  validate(schemas.slug, "params"),
  campaignController.getCampaignBySlug
);

// Get campaign by ID
router.get(
  "/id/:id",
  validate(schemas.mongoId, "params"),
  campaignController.getCampaignById
);

// Get campaign statistics
router.get(
  "/stats/:id",
  validate(schemas.mongoId, "params"),
  campaignController.getCampaignStats
);

module.exports = router;
