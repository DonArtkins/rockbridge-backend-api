const { stripe } = require("../config/stripe");
const logger = require("../utils/logger");

class StripeService {
  // Create payment intent for one-time donation
  async createPaymentIntent(amount, currency, metadata) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
        // Add receipt email if available
        ...(metadata.donorEmail && { receipt_email: metadata.donorEmail }),
      });

      return paymentIntent;
    } catch (error) {
      logger.error("Failed to create payment intent:", error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  // Retrieve payment intent
  async retrievePaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      logger.error("Failed to retrieve payment intent:", error);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  // Create customer for recurring donations
  async createCustomer(email, name, address = null) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        address,
      });

      return customer;
    } catch (error) {
      logger.error("Failed to create customer:", error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  // Create price for recurring donations
  async createPrice(amount, currency, interval) {
    try {
      const price = await stripe.prices.create({
        unit_amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        recurring: { interval },
        product_data: {
          name: "Recurring Donation",
        },
      });

      return price;
    } catch (error) {
      logger.error("Failed to create price:", error);
      throw new Error(`Failed to create price: ${error.message}`);
    }
  }

  // Create subscription for recurring donations
  async createSubscription(customerId, priceId, metadata) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        expand: ["latest_invoice.payment_intent"],
      });

      return subscription;
    } catch (error) {
      logger.error("Failed to create subscription:", error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    try {
      return await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      logger.error("Failed to cancel subscription:", error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Create refund
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      return await stripe.refunds.create(refundData);
    } catch (error) {
      logger.error("Failed to create refund:", error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  // Get payment methods for customer
  async getPaymentMethods(customerId) {
    try {
      return await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });
    } catch (error) {
      logger.error("Failed to get payment methods:", error);
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }
}

module.exports = new StripeService();
