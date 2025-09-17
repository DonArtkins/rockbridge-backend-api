const mongoose = require("mongoose");
const { Donation, Donor } = require("../models");
const { PAYMENT_STATUS } = require("../utils/constants");
const logger = require("../utils/logger");

class DonationService {
  // Create a new donation without campaign dependency
  async createDonation(donationData) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        // Create donation record
        const donation = new Donation(donationData);
        await donation.save({ session });

        // Create or update donor record
        const donor = await Donor.findOneAndUpdate(
          { email: donationData.donorInfo.email },
          {
            $set: {
              firstName: donationData.donorInfo.firstName,
              lastName: donationData.donorInfo.lastName,
              phone: donationData.donorInfo.phone,
              address: donationData.donorInfo.address,
            },
            $setOnInsert: {
              email: donationData.donorInfo.email,
              preferredCurrency: donationData.currency,
            },
          },
          {
            upsert: true,
            new: true,
            session,
          }
        );

        // Update donor statistics
        await donor.updateStats(donationData.amount);

        logger.info(`Donation created successfully: ${donation._id}`, {
          donationId: donation._id,
          ministry: donationData.ministry,
          amount: donationData.amount,
          donorEmail: donationData.donorInfo.email,
        });

        return donation;
      });
    } catch (error) {
      logger.error("Failed to create donation:", error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Create recurring donation from webhook
  async createRecurringDonation(invoiceData) {
    try {
      // Find the original subscription to get donor info
      const existingDonation = await Donation.findOne({
        stripeSubscriptionId: invoiceData.stripeSubscriptionId,
      });

      if (!existingDonation) {
        throw new Error("Original subscription donation not found");
      }

      const donationData = {
        donorInfo: existingDonation.donorInfo,
        ministry: existingDonation.ministry, // Use ministry instead of campaignId
        amount: invoiceData.amount,
        currency: invoiceData.currency,
        isRecurring: true,
        recurringFrequency: existingDonation.recurringFrequency,
        stripeSubscriptionId: invoiceData.stripeSubscriptionId,
        stripeCustomerId: invoiceData.stripeCustomerId,
        stripeInvoiceId: invoiceData.stripeInvoiceId,
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
        netAmount: invoiceData.amount,
        source: "recurring_webhook",
        processedAt: new Date(),
      };

      return await this.createDonation(donationData);
    } catch (error) {
      logger.error("Failed to create recurring donation:", error);
      throw error;
    }
  }

  // Cancel recurring donation
  async cancelRecurringDonation(subscriptionId) {
    try {
      const result = await Donation.updateMany(
        { stripeSubscriptionId: subscriptionId },
        {
          $set: {
            paymentStatus: "canceled",
            canceledAt: new Date(),
          },
        }
      );

      logger.info(
        `Canceled recurring donations for subscription: ${subscriptionId}`
      );
      return result;
    } catch (error) {
      logger.error("Failed to cancel recurring donation:", error);
      throw error;
    }
  }

  // Update donation status
  async updateDonationStatus(paymentIntentId, status) {
    try {
      const donation = await Donation.findOne({
        stripePaymentIntentId: paymentIntentId,
      });

      if (!donation) {
        throw new Error("Donation not found");
      }

      donation.paymentStatus = status;
      if (status === PAYMENT_STATUS.SUCCEEDED && !donation.processedAt) {
        donation.processedAt = new Date();
      }

      await donation.save();

      logger.info(`Donation status updated: ${donation._id} -> ${status}`);

      return donation;
    } catch (error) {
      logger.error("Failed to update donation status:", error);
      throw error;
    }
  }

  // Get donations with filtering
  async getDonations(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;

      const query = Donation.find(filters)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const donations = await query.exec();
      const total = await Donation.countDocuments(filters);

      return {
        donations,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalDonations: total,
      };
    } catch (error) {
      logger.error("Failed to get donations:", error);
      throw error;
    }
  }

  // Get donation by ID
  async getDonationById(donationId) {
    try {
      return await Donation.findById(donationId);
    } catch (error) {
      logger.error("Failed to get donation by ID:", error);
      throw error;
    }
  }

  // Get donation analytics by ministry
  async getAnalytics(filters = {}) {
    try {
      const { startDate, endDate, ministry } = filters;

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

      // Get daily donation trends
      const trendsPipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            dailyTotal: { $sum: "$amount" },
            dailyCount: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        { $limit: 30 },
      ];

      const trends = await Donation.aggregate(trendsPipeline);

      // Get ministry breakdown
      const ministryBreakdown = await Donation.aggregate([
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

      return {
        summary: analytics || {
          totalDonations: 0,
          totalAmount: 0,
          averageAmount: 0,
          uniqueDonorCount: 0,
          recurringDonations: 0,
          oneTimeDonations: 0,
        },
        trends,
        ministryBreakdown,
      };
    } catch (error) {
      logger.error("Failed to get donation analytics:", error);
      throw error;
    }
  }

  // Get ministry-specific statistics
  async getMinistryStats(ministry) {
    try {
      const pipeline = [
        {
          $match: {
            ministry: ministry,
            paymentStatus: PAYMENT_STATUS.SUCCEEDED,
          },
        },
        {
          $group: {
            _id: "$ministry",
            totalDonations: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            averageAmount: { $avg: "$amount" },
            uniqueDonors: { $addToSet: "$donorInfo.email" },
            largestDonation: { $max: "$amount" },
            smallestDonation: { $min: "$amount" },
            recurringDonations: {
              $sum: { $cond: ["$isRecurring", 1, 0] },
            },
          },
        },
        {
          $project: {
            ministry: "$_id",
            totalDonations: 1,
            totalAmount: { $round: ["$totalAmount", 2] },
            averageAmount: { $round: ["$averageAmount", 2] },
            uniqueDonorCount: { $size: "$uniqueDonors" },
            largestDonation: { $round: ["$largestDonation", 2] },
            smallestDonation: { $round: ["$smallestDonation", 2] },
            recurringDonations: 1,
            oneTimeDonations: {
              $subtract: ["$totalDonations", "$recurringDonations"],
            },
          },
        },
      ];

      const [stats] = await Donation.aggregate(pipeline);

      // Get recent donations for this ministry
      const recentDonations = await Donation.find({
        ministry: ministry,
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
        isAnonymous: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          "donorInfo.firstName donorInfo.lastName amount createdAt message"
        )
        .lean();

      return {
        stats: stats || {
          ministry,
          totalDonations: 0,
          totalAmount: 0,
          averageAmount: 0,
          uniqueDonorCount: 0,
          largestDonation: 0,
          smallestDonation: 0,
          recurringDonations: 0,
          oneTimeDonations: 0,
        },
        recentDonations,
      };
    } catch (error) {
      logger.error("Failed to get ministry stats:", error);
      throw error;
    }
  }

  // Get donor statistics
  async getDonorStats(donorEmail) {
    try {
      const pipeline = [
        {
          $match: {
            "donorInfo.email": donorEmail,
            paymentStatus: PAYMENT_STATUS.SUCCEEDED,
          },
        },
        {
          $group: {
            _id: "$donorInfo.email",
            totalDonations: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            averageAmount: { $avg: "$amount" },
            firstDonation: { $min: "$createdAt" },
            lastDonation: { $max: "$createdAt" },
            ministries: { $addToSet: "$ministry" },
          },
        },
      ];

      const [stats] = await Donation.aggregate(pipeline);
      return stats;
    } catch (error) {
      logger.error("Failed to get donor stats:", error);
      throw error;
    }
  }

  // Get top donors
  async getTopDonors(limit = 10) {
    try {
      const pipeline = [
        {
          $match: {
            paymentStatus: PAYMENT_STATUS.SUCCEEDED,
            isAnonymous: false,
          },
        },
        {
          $group: {
            _id: "$donorInfo.email",
            firstName: { $first: "$donorInfo.firstName" },
            lastName: { $first: "$donorInfo.lastName" },
            totalDonated: { $sum: "$amount" },
            donationCount: { $sum: 1 },
            lastDonation: { $max: "$createdAt" },
          },
        },
        { $sort: { totalDonated: -1 } },
        { $limit: limit },
      ];

      return await Donation.aggregate(pipeline);
    } catch (error) {
      logger.error("Failed to get top donors:", error);
      throw error;
    }
  }
}

module.exports = new DonationService();
