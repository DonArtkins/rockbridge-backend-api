const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Get payment methods for customer
router.get(
  "/customers/:customerId/payment-methods",
  paymentController.getPaymentMethods
);

// Create refund (admin only - you'll need to add auth middleware later)
router.post("/refund", paymentController.createRefund);

// Cancel subscription
router.delete(
  "/subscriptions/:subscriptionId/cancel",
  paymentController.cancelSubscription
);

module.exports = router;
