const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const { validateCampaignQuery } = require("../middlewares/validation");

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *         goalAmount:
 *           type: number
 *         raisedAmount:
 *           type: number
 *         progressPercentage:
 *           type: number
 *         status:
 *           type: string
 *           enum: [active, completed, paused, draft]
 */

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Get all campaigns
 *     tags: [Campaigns]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of campaigns
 */
router.get("/", validateCampaignQuery, campaignController.getAllCampaigns);

/**
 * @swagger
 * /api/campaigns/featured:
 *   get:
 *     summary: Get featured campaigns
 *     tags: [Campaigns]
 *     responses:
 *       200:
 *         description: List of featured campaigns
 */
router.get("/featured", campaignController.getFeaturedCampaigns);

/**
 * @swagger
 * /api/campaigns/{slug}:
 *   get:
 *     summary: Get campaign by slug
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign details
 *       404:
 *         description: Campaign not found
 */
router.get("/:slug", campaignController.getCampaignBySlug);

/**
 * @swagger
 * /api/campaigns/id/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign details
 *       404:
 *         description: Campaign not found
 */
router.get("/id/:id", campaignController.getCampaignById);

module.exports = router;
