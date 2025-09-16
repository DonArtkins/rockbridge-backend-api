const { Campaign } = require("../models");
const { HTTP_STATUS, MESSAGES } = require("../utils/constants");
const { getPaginationInfo } = require("../utils/helpers");
const logger = require("../utils/logger");

class CampaignController {
  // Get all campaigns with filtering and pagination
  async getAllCampaigns(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status,
        search,
        sort = "-createdAt",
      } = req.query;

      // Build filter object
      const filter = {};

      if (category) filter.category = category;
      if (status) filter.status = status;
      else filter.status = { $in: ["active", "completed"] }; // Hide drafts by default

      if (search) {
        filter.$text = { $search: search };
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
        populate: [
          {
            path: "donorCount",
            select: "totalDonated donationCount",
          },
        ],
      };

      const result = await Campaign.paginate(filter, options);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: MESSAGES.SUCCESS.CAMPAIGN_FETCHED,
        data: {
          campaigns: result.docs,
          pagination: getPaginationInfo(
            result.page,
            result.limit,
            result.totalDocs
          ),
        },
      });
    } catch (error) {
      logger.error("Error fetching campaigns:", error);
      next(error);
    }
  }

  // Get campaign by slug
  async getCampaignBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const campaign = await Campaign.findOne({
        slug,
        status: { $in: ["active", "completed"] },
      });

      if (!campaign) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: MESSAGES.ERROR.CAMPAIGN_NOT_FOUND,
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: MESSAGES.SUCCESS.CAMPAIGN_FETCHED,
        data: { campaign },
      });
    } catch (error) {
      logger.error("Error fetching campaign by slug:", error);
      next(error);
    }
  }

  // Get campaign by ID
  async getCampaignById(req, res, next) {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findById(id);

      if (!campaign) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: MESSAGES.ERROR.CAMPAIGN_NOT_FOUND,
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: MESSAGES.SUCCESS.CAMPAIGN_FETCHED,
        data: { campaign },
      });
    } catch (error) {
      logger.error("Error fetching campaign by ID:", error);
      next(error);
    }
  }

  // Get campaign statistics
  async getCampaignStats(req, res, next) {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findById(id);

      if (!campaign) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: MESSAGES.ERROR.CAMPAIGN_NOT_FOUND,
        });
      }

      // Get donation statistics for this campaign
      const donationService = require("../services/donationService");
      const donationStats = await donationService.getCampaignStats(id);

      const stats = {
        campaign: {
          id: campaign._id,
          title: campaign.title,
          goalAmount: campaign.goalAmount,
          raisedAmount: campaign.raisedAmount,
          progressPercentage: campaign.progressPercentage,
          donorCount: campaign.donorCount,
          daysRemaining: campaign.daysRemaining,
          status: campaign.status,
        },
        donations: donationStats,
      };

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      logger.error("Error fetching campaign stats:", error);
      next(error);
    }
  }

  // Get featured campaigns
  async getFeaturedCampaigns(req, res, next) {
    try {
      const { limit = 6 } = req.query;

      const campaigns = await Campaign.find({
        status: "active",
        $or: [{ isUrgent: true }, { priority: { $gte: 5 } }],
      })
        .sort({ isUrgent: -1, priority: -1, createdAt: -1 })
        .limit(parseInt(limit));

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { campaigns },
      });
    } catch (error) {
      logger.error("Error fetching featured campaigns:", error);
      next(error);
    }
  }
}

module.exports = new CampaignController();
