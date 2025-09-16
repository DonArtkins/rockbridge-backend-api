const { Campaign } = require("../models");
const logger = require("../utils/logger");

class CampaignService {
  // Get all campaigns with filtering
  async getAllCampaigns(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;

      const query = Campaign.find(filters)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const campaigns = await query.exec();
      const total = await Campaign.countDocuments(filters);

      return {
        campaigns,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalCampaigns: total,
      };
    } catch (error) {
      logger.error("Failed to get campaigns:", error);
      throw error;
    }
  }

  // Get campaign by slug
  async getCampaignBySlug(slug) {
    try {
      return await Campaign.findOne({
        slug,
        status: { $in: ["active", "completed"] },
      });
    } catch (error) {
      logger.error("Failed to get campaign by slug:", error);
      throw error;
    }
  }

  // Get campaign by ID
  async getCampaignById(campaignId) {
    try {
      return await Campaign.findById(campaignId);
    } catch (error) {
      logger.error("Failed to get campaign by ID:", error);
      throw error;
    }
  }

  // Get featured campaigns
  async getFeaturedCampaigns(limit = 6) {
    try {
      return await Campaign.find({
        status: "active",
        $or: [{ isUrgent: true }, { priority: { $gte: 5 } }],
      })
        .sort({ isUrgent: -1, priority: -1, createdAt: -1 })
        .limit(parseInt(limit));
    } catch (error) {
      logger.error("Failed to get featured campaigns:", error);
      throw error;
    }
  }

  // Get campaigns by category
  async getCampaignsByCategory(category, limit = 10) {
    try {
      return await Campaign.find({
        category,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
    } catch (error) {
      logger.error("Failed to get campaigns by category:", error);
      throw error;
    }
  }

  // Update campaign raised amount
  async updateRaisedAmount(campaignId, amount) {
    try {
      return await Campaign.findByIdAndUpdate(
        campaignId,
        {
          $inc: {
            raisedAmount: amount,
            donorCount: 1,
          },
        },
        { new: true }
      );
    } catch (error) {
      logger.error("Failed to update campaign raised amount:", error);
      throw error;
    }
  }

  // Get campaign progress
  async getCampaignProgress(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return {
        goalAmount: campaign.goalAmount,
        raisedAmount: campaign.raisedAmount,
        progressPercentage: campaign.progressPercentage,
        donorCount: campaign.donorCount,
        remainingAmount: campaign.goalAmount - campaign.raisedAmount,
        isCompleted: campaign.raisedAmount >= campaign.goalAmount,
        daysRemaining: campaign.daysRemaining,
      };
    } catch (error) {
      logger.error("Failed to get campaign progress:", error);
      throw error;
    }
  }

  // Search campaigns
  async searchCampaigns(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status = ["active", "completed"],
      } = options;

      const searchFilter = {
        $and: [
          { status: { $in: status } },
          {
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
              { shortDescription: { $regex: query, $options: "i" } },
            ],
          },
        ],
      };

      if (category) {
        searchFilter.$and.push({ category });
      }

      const campaigns = await Campaign.find(searchFilter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Campaign.countDocuments(searchFilter);

      return {
        campaigns,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalCampaigns: total,
        query,
      };
    } catch (error) {
      logger.error("Failed to search campaigns:", error);
      throw error;
    }
  }

  // Get campaign statistics
  async getCampaignStatistics() {
    try {
      const stats = await Campaign.aggregate([
        {
          $group: {
            _id: null,
            totalCampaigns: { $sum: 1 },
            activeCampaigns: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            completedCampaigns: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            totalRaised: { $sum: "$raisedAmount" },
            totalGoal: { $sum: "$goalAmount" },
            totalDonors: { $sum: "$donorCount" },
            averageGoal: { $avg: "$goalAmount" },
            averageRaised: { $avg: "$raisedAmount" },
          },
        },
        {
          $project: {
            _id: 0,
            totalCampaigns: 1,
            activeCampaigns: 1,
            completedCampaigns: 1,
            totalRaised: { $round: ["$totalRaised", 2] },
            totalGoal: { $round: ["$totalGoal", 2] },
            totalDonors: 1,
            averageGoal: { $round: ["$averageGoal", 2] },
            averageRaised: { $round: ["$averageRaised", 2] },
            overallProgress: {
              $round: [
                {
                  $multiply: [{ $divide: ["$totalRaised", "$totalGoal"] }, 100],
                },
                2,
              ],
            },
          },
        },
      ]);

      return (
        stats[0] || {
          totalCampaigns: 0,
          activeCampaigns: 0,
          completedCampaigns: 0,
          totalRaised: 0,
          totalGoal: 0,
          totalDonors: 0,
          averageGoal: 0,
          averageRaised: 0,
          overallProgress: 0,
        }
      );
    } catch (error) {
      logger.error("Failed to get campaign statistics:", error);
      throw error;
    }
  }
}

module.exports = new CampaignService();
