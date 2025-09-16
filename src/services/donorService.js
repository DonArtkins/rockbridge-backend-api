const { Donor, Donation } = require("../models");
const { PAYMENT_STATUS } = require("../utils/constants");
const logger = require("../utils/logger");

class DonorService {
  // Create or update donor
  async createOrUpdateDonor(donorData) {
    try {
      const donor = await Donor.findOneAndUpdate(
        { email: donorData.email },
        {
          $set: {
            firstName: donorData.firstName,
            lastName: donorData.lastName,
            phone: donorData.phone,
            address: donorData.address,
          },
          $setOnInsert: {
            email: donorData.email,
            preferredCurrency: donorData.currency || "USD",
            communicationPreferences: {
              email: true,
              newsletter: false,
              updates: true,
              taxReceipts: true,
            },
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      logger.info(`Donor created/updated: ${donor._id}`);
      return donor;
    } catch (error) {
      logger.error("Failed to create/update donor:", error);
      throw error;
    }
  }

  // Get donor by email
  async getDonorByEmail(email) {
    try {
      return await Donor.findOne({ email });
    } catch (error) {
      logger.error("Failed to get donor by email:", error);
      throw error;
    }
  }

  // Get donor by ID
  async getDonorById(donorId) {
    try {
      return await Donor.findById(donorId);
    } catch (error) {
      logger.error("Failed to get donor by ID:", error);
      throw error;
    }
  }

  // Get all donors with filtering
  async getDonors(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort = { lastDonationDate: -1 } } = options;

      const query = Donor.find(filters)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const donors = await query.exec();
      const total = await Donor.countDocuments(filters);

      return {
        donors,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalDonors: total,
      };
    } catch (error) {
      logger.error("Failed to get donors:", error);
      throw error;
    }
  }

  // Get donor donation history
  async getDonorHistory(donorEmail, options = {}) {
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;

      const donations = await Donation.find({
        "donorInfo.email": donorEmail,
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
      })
        .populate("campaignId", "title slug")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Donation.countDocuments({
        "donorInfo.email": donorEmail,
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
      });

      // Get donor statistics
      const stats = await this.getDonorStats(donorEmail);

      return {
        donations,
        stats,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalDonations: total,
      };
    } catch (error) {
      logger.error("Failed to get donor history:", error);
      throw error;
    }
  }

  // Get donor statistics
  async getDonorStats(donorEmail) {
    try {
      const stats = await Donation.aggregate([
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
            campaigns: { $addToSet: "$campaignId" },
            recurringDonations: {
              $sum: { $cond: ["$isRecurring", 1, 0] },
            },
            largestDonation: { $max: "$amount" },
            currencies: { $addToSet: "$currency" },
          },
        },
        {
          $project: {
            _id: 0,
            totalDonations: 1,
            totalAmount: { $round: ["$totalAmount", 2] },
            averageAmount: { $round: ["$averageAmount", 2] },
            firstDonation: 1,
            lastDonation: 1,
            campaignCount: { $size: "$campaigns" },
            recurringDonations: 1,
            oneTimeDonations: {
              $subtract: ["$totalDonations", "$recurringDonations"],
            },
            largestDonation: { $round: ["$largestDonation", 2] },
            currencies: 1,
          },
        },
      ]);

      return (
        stats[0] || {
          totalDonations: 0,
          totalAmount: 0,
          averageAmount: 0,
          firstDonation: null,
          lastDonation: null,
          campaignCount: 0,
          recurringDonations: 0,
          oneTimeDonations: 0,
          largestDonation: 0,
          currencies: [],
        }
      );
    } catch (error) {
      logger.error("Failed to get donor stats:", error);
      throw error;
    }
  }

  // Update donor communication preferences
  async updateCommunicationPreferences(donorEmail, preferences) {
    try {
      const donor = await Donor.findOneAndUpdate(
        { email: donorEmail },
        { $set: { communicationPreferences: preferences } },
        { new: true }
      );

      if (!donor) {
        throw new Error("Donor not found");
      }

      logger.info(`Communication preferences updated for donor: ${donorEmail}`);
      return donor;
    } catch (error) {
      logger.error("Failed to update communication preferences:", error);
      throw error;
    }
  }

  // Get top donors
  async getTopDonors(limit = 10) {
    try {
      return await Donor.find({ isActive: true })
        .sort({ totalDonated: -1 })
        .limit(parseInt(limit))
        .select(
          "firstName lastName email totalDonated donationCount lastDonationDate"
        );
    } catch (error) {
      logger.error("Failed to get top donors:", error);
      throw error;
    }
  }

  // Get recent donors
  async getRecentDonors(limit = 10) {
    try {
      return await Donor.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select("firstName lastName email totalDonated createdAt");
    } catch (error) {
      logger.error("Failed to get recent donors:", error);
      throw error;
    }
  }

  // Add tag to donor
  async addTagToDonor(donorEmail, tag) {
    try {
      const donor = await Donor.findOneAndUpdate(
        { email: donorEmail },
        { $addToSet: { tags: tag } },
        { new: true }
      );

      if (!donor) {
        throw new Error("Donor not found");
      }

      logger.info(`Tag '${tag}' added to donor: ${donorEmail}`);
      return donor;
    } catch (error) {
      logger.error("Failed to add tag to donor:", error);
      throw error;
    }
  }

  // Remove tag from donor
  async removeTagFromDonor(donorEmail, tag) {
    try {
      const donor = await Donor.findOneAndUpdate(
        { email: donorEmail },
        { $pull: { tags: tag } },
        { new: true }
      );

      if (!donor) {
        throw new Error("Donor not found");
      }

      logger.info(`Tag '${tag}' removed from donor: ${donorEmail}`);
      return donor;
    } catch (error) {
      logger.error("Failed to remove tag from donor:", error);
      throw error;
    }
  }

  // Get donor segments
  async getDonorSegments() {
    try {
      const segments = await Donor.aggregate([
        {
          $group: {
            _id: null,
            totalDonors: { $sum: 1 },
            activeDonors: {
              $sum: { $cond: ["$isActive", 1, 0] },
            },
            majorDonors: {
              $sum: { $cond: [{ $gte: ["$totalDonated", 1000] }, 1, 0] },
            },
            recurringDonors: {
              $sum: { $cond: [{ $in: ["recurring", "$tags"] }, 1, 0] },
            },
            firstTimeDonors: {
              $sum: { $cond: [{ $eq: ["$donationCount", 1] }, 1, 0] },
            },
          },
        },
      ]);

      return (
        segments[0] || {
          totalDonors: 0,
          activeDonors: 0,
          majorDonors: 0,
          recurringDonors: 0,
          firstTimeDonors: 0,
        }
      );
    } catch (error) {
      logger.error("Failed to get donor segments:", error);
      throw error;
    }
  }
}

module.exports = new DonorService();
