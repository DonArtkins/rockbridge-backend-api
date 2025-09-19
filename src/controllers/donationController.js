const { Donation } = require("../models");
const stripeService = require("../services/stripeService");
const emailService = require("../services/emailService");
const { HTTP_STATUS, MESSAGES, PAYMENT_STATUS } = require("../utils/constants");
const { getPaginationInfo } = require("../utils/helpers");
const logger = require("../utils/logger");

class DonationController {
  // Create donation intent (Step 1: Prepare payment)
  async createDonationIntent(req, res, next) {
    try {
      const {
        ministry,
        amount,
        currency = "USD",
        donorInfo,
        isRecurring = false,
      } = req.body;

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

      // Convert amount from cents to dollars if it's already in cents
      let amountInDollars = amount;
      if (amount > 100000) {
        // If amount is greater than 100k, it's likely in cents, convert to dollars
        amountInDollars = Math.round(amount / 100);
      }

      // Validate converted amount
      if (amountInDollars < 1 || amountInDollars > 100000) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Amount must be between $1 and $100,000",
        });
      }

      // Create payment intent with Stripe (amount in dollars)
      const paymentIntent = await stripeService.createPaymentIntent(
        amountInDollars,
        currency,
        {
          ministry: ministry,
          donorEmail: donorInfo.email,
          donorName: `${donorInfo.firstName} ${donorInfo.lastName}`,
          isRecurring: isRecurring.toString(),
        },
        isRecurring
      );

      logger.info(`Payment intent created: ${paymentIntent.id}`, {
        ministry,
        amount: amountInDollars,
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

      if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Invalid payment intent ID",
        });
      }

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

      // Convert amount from cents to dollars for storage
      const amountInDollars = paymentIntent.amount / 100;

      // Create donation record
      const donationData = {
        ...req.body,
        amount: amountInDollars, // Store in dollars
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
        netAmount: amountInDollars,
        transactionFee: (paymentIntent.application_fee_amount || 0) / 100,
        processedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      };

      const donation = new Donation(donationData);
      await donation.save();

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
        message: "Donation processed successfully",
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

  // Get all donations with filtering and pagination
  async getDonations(req, res, next) {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit) };
      const result = await donationService.getDonations(filters, options);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get donation analytics
  async getDonationAnalytics(req, res, next) {
    try {
      const { startDate, endDate, ministry } = req.query;

      const matchStage = {
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
      };

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      if (ministry) {
        matchStage.ministry = ministry;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalDonations: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            averageAmount: { $avg: "$amount" },
            uniqueDonors: { $addToSet: "$donorInfo.email" },
            recurringDonations: {
              $sum: { $cond: ["$isRecurring", 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalDonations: 1,
            totalAmount: { $round: ["$totalAmount", 2] },
            averageAmount: { $round: ["$averageAmount", 2] },
            uniqueDonorCount: { $size: "$uniqueDonors" },
            recurringDonations: 1,
            oneTimeDonations: {
              $subtract: ["$totalDonations", "$recurringDonations"],
            },
          },
        },
      ];

      const [analytics] = await Donation.aggregate(pipeline);

      // Get ministry-wise breakdown
      const ministryStats = await Donation.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$ministry",
            totalAmount: { $sum: "$amount" },
            totalDonations: { $sum: 1 },
            avgAmount: { $avg: "$amount" },
          },
        },
        {
          $project: {
            ministry: "$_id",
            totalAmount: { $round: ["$totalAmount", 2] },
            totalDonations: 1,
            avgAmount: { $round: ["$avgAmount", 2] },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          analytics: analytics || {
            totalDonations: 0,
            totalAmount: 0,
            averageAmount: 0,
            uniqueDonorCount: 0,
            recurringDonations: 0,
            oneTimeDonations: 0,
          },
          ministryStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DonationController();
