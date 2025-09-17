const { Donation, Donor } = require("../models");
const donationService = require("../services/donationService");
const stripeService = require("../services/stripeService");
const emailService = require("../services/emailService");
const { HTTP_STATUS, MESSAGES, PAYMENT_STATUS } = require("../utils/constants");
const { getPaginationInfo } = require("../utils/helpers");
const logger = require("../utils/logger");

class DonationController {
  // Create donation intent (Step 1: Prepare payment)
  async createDonationIntent(req, res, next) {
    try {
      const { ministry, amount, currency, donorInfo, isRecurring } = req.body;

      // Validate ministry initiative exists
      const validMinistries = [
        "Holiday Homes",
        "Clean Water Initiative",
        "Workplace Ministry",
        "Lish AI Labs",
        "Upendo Academy",
      ];

      if (!validMinistries.includes(ministry)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Invalid ministry initiative selected",
        });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripeService.createPaymentIntent(
        amount,
        currency,
        {
          ministry: ministry,
          donorEmail: donorInfo.email,
          donorName: `${donorInfo.firstName} ${donorInfo.lastName}`,
          isRecurring: isRecurring.toString(),
        }
      );

      logger.info(`Payment intent created: ${paymentIntent.id}`, {
        ministry,
        amount,
        currency,
        donorEmail: donorInfo.email,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          ministry: ministry,
        },
      });
    } catch (error) {
      logger.error("Error creating donation intent:", error);
      next(error);
    }
  }

  // Confirm donation (Step 2: After successful payment)
  async confirmDonation(req, res, next) {
    try {
      const { paymentIntentId } = req.body;

      // Verify payment with Stripe
      const paymentIntent = await stripeService.retrievePaymentIntent(
        paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Payment not successful",
          paymentStatus: paymentIntent.status,
        });
      }

      // Create donation record
      const donation = await donationService.createDonation({
        ...req.body,
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
        netAmount:
          (paymentIntent.amount - (paymentIntent.application_fee_amount || 0)) /
          100,
        transactionFee: (paymentIntent.application_fee_amount || 0) / 100,
      });

      // Send confirmation emails asynchronously
      setImmediate(async () => {
        try {
          await emailService.sendDonationReceipt(donation);
          await emailService.sendThankYouEmail(donation);
          await emailService.sendDonationNotification(donation);
        } catch (emailError) {
          logger.error("Failed to send confirmation emails:", emailError);
        }
      });

      logger.info(`Donation confirmed: ${donation._id}`, {
        donationId: donation._id,
        ministry: donation.ministry,
        amount: donation.amount,
        donorEmail: donation.donorInfo.email,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: MESSAGES.SUCCESS.DONATION_CREATED,
        data: {
          donationId: donation._id,
          amount: donation.amount,
          currency: donation.currency,
          ministry: donation.ministry,
        },
      });
    } catch (error) {
      logger.error("Error confirming donation:", error);
      next(error);
    }
  }

  // Get donation by ID
  async getDonationById(req, res, next) {
    try {
      const { id } = req.params;

      const donation = await Donation.findById(id).lean();

      if (!donation) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Donation not found",
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { donation },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get donations with filtering (admin only)
  async getDonations(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        ministry,
        startDate,
        endDate,
        sort = "-createdAt",
      } = req.query;

      // Build filter object
      const filter = {};

      if (status) filter.paymentStatus = status;
      if (ministry) filter.ministry = ministry;

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      // Parse sort parameter
      const sortObj = {};
      const sortFields = sort.split(",");
      sortFields.forEach((field) => {
        const trimmed = field.trim();
        if (trimmed.startsWith("-")) {
          sortObj[trimmed.substring(1)] = -1;
        } else {
          sortObj[trimmed] = 1;
        }
      });

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sortObj,
      };

      const result = await Donation.paginate(filter, options);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          donations: result.docs,
          pagination: getPaginationInfo(
            result.page,
            result.limit,
            result.totalDocs
          ),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get donation analytics
  async getDonationAnalytics(req, res, next) {
    try {
      const { startDate, endDate, ministry } = req.query;

      const analytics = await donationService.getAnalytics({
        startDate,
        endDate,
        ministry,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { analytics },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get recent donations (for public display)
  async getRecentDonations(req, res, next) {
    try {
      const { limit = 10, ministry } = req.query;

      const filter = {
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
        isAnonymous: false,
      };

      if (ministry) filter.ministry = ministry;

      const donations = await Donation.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select(
          "donorInfo.firstName donorInfo.lastName amount currency message createdAt ministry"
        )
        .lean();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { donations },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DonationController();
