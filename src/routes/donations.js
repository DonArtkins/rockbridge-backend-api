const express = require("express");
const router = express.Router();
const donationController = require("../controllers/donationController");
const {
  validateDonationIntent,
  validateDonationConfirm,
  validateDonationQuery,
  validateAnalyticsQuery,
} = require("../middlewares/validation");
const auth = require("../middlewares/auth");
const rateLimit = require("../middlewares/rateLimit");

/**
 * @swagger
 * components:
 *   schemas:
 *     Donation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         donorInfo:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             email:
 *               type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         campaignId:
 *           type: string
 *         paymentStatus:
 *           type: string
 */

/**
 * @swagger
 * /api/donations/intent:
 *   post:
 *     summary: Create donation payment intent
 *     tags: [Donations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - amount
 *               - currency
 *               - donorInfo
 *             properties:
 *               campaignId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 1
 *               currency:
 *                 type: string
 *                 default: USD
 *               donorInfo:
 *                 type: object
 *               isRecurring:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Payment intent created
 *       400:
 *         description: Validation error
 */
router.post(
  "/intent",
  rateLimit.createDonation,
  validateDonationIntent,
  donationController.createDonationIntent
);

/**
 * @swagger
 * /api/donations/confirm:
 *   post:
 *     summary: Confirm donation after payment
 *     tags: [Donations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *               - campaignId
 *               - amount
 *               - donorInfo
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *               campaignId:
 *                 type: string
 *               amount:
 *                 type: number
 *               donorInfo:
 *                 type: object
 *     responses:
 *       201:
 *         description: Donation confirmed
 *       400:
 *         description: Payment not successful
 */
router.post(
  "/confirm",
  validateDonationConfirm,
  donationController.confirmDonation
);

/**
 * @swagger
 * /api/donations/recent:
 *   get:
 *     summary: Get recent donations (public)
 *     tags: [Donations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of recent donations
 */
router.get("/recent", donationController.getRecentDonations);

/**
 * @swagger
 * /api/donations/{id}:
 *   get:
 *     summary: Get donation by ID
 *     tags: [Donations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Donation details
 *       404:
 *         description: Donation not found
 */
router.get("/:id", donationController.getDonationById);

// Admin routes (require authentication)
/**
 * @swagger
 * /api/donations:
 *   get:
 *     summary: Get all donations (admin only)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of donations
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  auth.authenticate,
  validateDonationQuery,
  donationController.getDonations
);

/**
 * @swagger
 * /api/donations/analytics:
 *   get:
 *     summary: Get donation analytics (admin only)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Donation analytics
 */
router.get(
  "/analytics/summary",
  auth.authenticate,
  validateAnalyticsQuery,
  donationController.getDonationAnalytics
);

module.exports = router;
