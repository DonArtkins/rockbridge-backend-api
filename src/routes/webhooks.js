const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook signature verification failed
 */
router.post("/stripe", webhookController.handleStripeWebhook);

module.exports = router;
