const { stripe, webhookSecret } = require("../config/stripe");
const donationService = require("../services/donationService");
const emailService = require("../services/emailService");
const { STRIPE_WEBHOOK_EVENTS } = require("../utils/constants");
const logger = require("../utils/logger");

class WebhookController {
  // Handle Stripe webhooks
  async handleStripeWebhook(req, res, next) {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info(`Received webhook event: ${event.type}`, {
      eventId: event.id,
      eventType: event.type,
    });

    try {
      await this.processWebhookEvent(event);
      res.json({ received: true });
    } catch (error) {
      logger.error("Webhook processing failed:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }

  // Process different webhook events
  async processWebhookEvent(event) {
    switch (event.type) {
      case STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED:
        await this.handlePaymentSucceeded(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED:
        await this.handlePaymentFailed(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED:
        await this.handleRecurringPaymentSucceeded(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
        await this.handleRecurringPaymentFailed(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED:
        await this.handleSubscriptionCanceled(event.data.object);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }
  }

  // Handle successful one-time payment
  async handlePaymentSucceeded(paymentIntent) {
    try {
      await donationService.updateDonationStatus(paymentIntent.id, "succeeded");

      logger.info(`Payment succeeded webhook processed: ${paymentIntent.id}`);
    } catch (error) {
      logger.error("Error processing payment succeeded webhook:", error);
      throw error;
    }
  }

  // Handle failed payment
  async handlePaymentFailed(paymentIntent) {
    try {
      await donationService.updateDonationStatus(paymentIntent.id, "failed");

      logger.info(`Payment failed webhook processed: ${paymentIntent.id}`);
    } catch (error) {
      logger.error("Error processing payment failed webhook:", error);
      throw error;
    }
  }

  // Handle successful recurring payment
  async handleRecurringPaymentSucceeded(invoice) {
    try {
      const subscriptionId = invoice.subscription;
      const customerId = invoice.customer;

      // Create donation record for recurring payment
      await donationService.createRecurringDonation({
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
      });

      logger.info(`Recurring payment succeeded: ${invoice.id}`);
    } catch (error) {
      logger.error("Error processing recurring payment succeeded:", error);
      throw error;
    }
  }

  // Handle failed recurring payment
  async handleRecurringPaymentFailed(invoice) {
    try {
      logger.warn(`Recurring payment failed: ${invoice.id}`);

      // Send notification email to donor about failed payment
      // Implementation depends on your email service setup
    } catch (error) {
      logger.error("Error processing recurring payment failed:", error);
      throw error;
    }
  }

  // Handle subscription cancellation
  async handleSubscriptionCanceled(subscription) {
    try {
      await donationService.cancelRecurringDonation(subscription.id);

      logger.info(`Subscription canceled: ${subscription.id}`);
    } catch (error) {
      logger.error("Error processing subscription cancellation:", error);
      throw error;
    }
  }
}

module.exports = new WebhookController();
