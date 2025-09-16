const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { validateRefund } = require("../middlewares/validation");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * components:
 *   schemas:
 *     Refund:
 *       type: object
 *       properties:
 *         paymentIntentId:
 *           type: string
 *         amount:
 *           type: number
 *         reason:
 *           type: string
 */

/**
 * @swagger
 * /api/payments/customers/{customerId}/payment-methods:
 *   get:
 *     summary: Get payment methods for customer
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer payment methods
 */
router.get(
  "/customers/:customerId/payment-methods",
  auth.authenticate,
  paymentController.getPaymentMethods
);

/**
 * @swagger
 * /api/payments/refund:
 *   post:
 *     summary: Create refund (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Refund'
 *     responses:
 *       201:
 *         description: Refund created
 *       400:
 *         description: Invalid request
 */
router.post(
  "/refund",
  auth.authenticate,
  auth.requireAdmin,
  validateRefund,
  paymentController.createRefund
);

/**
 * @swagger
 * /api/payments/subscriptions/{subscriptionId}/cancel:
 *   delete:
 *     summary: Cancel subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription canceled
 */
router.delete(
  "/subscriptions/:subscriptionId/cancel",
  auth.authenticate,
  paymentController.cancelSubscription
);

module.exports = router;
