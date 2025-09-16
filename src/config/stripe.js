const Stripe = require("stripe");
const logger = require("../utils/logger");

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  timeout: 30000, // 30 seconds
  maxNetworkRetries: 3,
  telemetry: false,
});

// Test Stripe connection
const testStripeConnection = async () => {
  try {
    await stripe.accounts.retrieve();
    logger.info("💳 Stripe connection successful");
  } catch (error) {
    logger.error("❌ Stripe connection failed:", error);
    throw error;
  }
};

module.exports = {
  stripe,
  testStripeConnection,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};
