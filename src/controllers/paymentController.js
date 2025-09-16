const stripeService = require("../services/stripeService");
const { HTTP_STATUS } = require("../utils/constants");
const logger = require("../utils/logger");

class PaymentController {
  // Get payment methods for a customer
  async getPaymentMethods(req, res, next) {
    try {
      const { customerId } = req.params;

      const paymentMethods = await stripeService.getPaymentMethods(customerId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { paymentMethods },
      });
    } catch (error) {
      next(error);
    }
  }

  // Create refund
  async createRefund(req, res, next) {
    try {
      const { paymentIntentId, amount, reason } = req.body;

      const refund = await stripeService.createRefund(paymentIntentId, amount);

      // Update donation status in database
      await require("../services/donationService").updateDonationStatus(
        paymentIntentId,
        "refunded"
      );

      logger.info(`Refund created: ${refund.id}`, {
        paymentIntentId,
        amount,
        reason,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Refund processed successfully",
        data: { refund },
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res, next) {
    try {
      const { subscriptionId } = req.params;

      const canceledSubscription = await stripeService.cancelSubscription(
        subscriptionId
      );

      logger.info(`Subscription canceled: ${subscriptionId}`);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Subscription canceled successfully",
        data: { subscription: canceledSubscription },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
