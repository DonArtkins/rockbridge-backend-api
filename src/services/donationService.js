const mongoose = require('mongoose');
const { Donation, Campaign, Donor } = require('../models');
const { PAYMENT_STATUS } = require('../utils/constants');
const { generateReceiptNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

class DonationService {
  // Create a new donation
  async createDonation(donationData) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Create donation record
        const donation = new Donation(donationData);
        await donation.save({ session });

        // Update campaign statistics
        await Campaign.findByIdAndUpdate(
          donationData.campaignId,
          {
            $inc: {
              raisedAmount: donationData.amount,
              donorCount: 1,
            },
          },
          { session }
        );

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
            session 
          }
        );

        // Update donor statistics
        await donor.updateStats(donationData.amount);

        logger.info(`Donation created successfully: ${donation._id}`, {
          donationId: donation._id,
          campaignId: donationData.campaignId,
          amount: donationData.amount,
          donorEmail: donationData.donorInfo.email,
        });

        return donation;
      });
    } catch (error) {
      logger.error('Failed to create donation:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Update donation status
  async updateDonationStatus(paymentIntentId, status) {
    try {
      const donation = await Donation.findOne({ stripePaymentIntentId: paymentIntentId });
      
      if (!donation) {
        throw new Error('Donation not found');
      }

      donation.paymentStatus = status;
      if (status === PAYMENT_STATUS.SUCCEEDED && !donation.processedAt) {
        donation.processedAt = new Date();
      }

      await donation.save();

      logger.info(`Donation status updated: ${donation._id} -> ${status}`);
      
      return donation;
    } catch (error) {
      logger.error('Failed to update donation status:', error);
      throw error;
    }
  }

  // Get donations with filtering
  async getDonations(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
      } = options;

      const query = Donation.find(filters)
        .populate('campaignId', 'title slug')
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
      logger.error('Failed to get donations:', error);
      throw error;
    }
  }

  // Get donation by ID
  async getDonationById(donationId) {
    try {
      return await Donation.findById(donationId)
        .populate('campaignId', 'title slug description');
    } catch (error) {
      logger.error('Failed to get donation by ID:', error);
      throw error;
    }
  }

  // Get donation analytics
  async getAnalytics(filters = {}) {
    try {
      const { startDate, endDate, campaignId } = filters;
      
      const matchStage = {
        paymentStatus: PAYMENT_STATUS.SUCCEEDED,
      };

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      if (campaignId) {
        matchStage.campaignId = new mongoose.Types.ObjectId(campaignId);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalDonations: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' },
            uniqueDonors: { $addToSet: '$donorInfo.email' },
            recurringDonations: {
              $sum: { $cond: ['$isRecurring', 1, 0] }
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalDonations: 1,
            totalAmount: { $round: ['$totalAmount', 2] },
            averageAmount: { $round: ['$averageAmount', 2] },
            uniqueDonorCount: { $size: '$uniqueDonors' },
            recurringDonations: 1,
            oneTimeDonations: { $subtract: ['$totalDonations', '$recurringDonations'] },
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
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            dailyTotal: { $sum: '$amount' },
            dailyCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 30 }, // Last 30 days
      ];

      const trends = await Donation.aggregate(trendsPipeline);

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
      };
    } catch (error) {
      logger.error('Failed to get donation analytics:', error);
      throw error;
    }
  }

  // Get campaign-specific statistics
  async getCampaignStats(campaignId) {
    try {
      const pipeline = [
        {
          $match: {
            campaignId: new mongoose.Types.ObjectId(campaignId),
            paymentStatus: PAYMENT_STATUS.SUCCEEDED,
          },
        },
        {
          $group: {
            _id: null,
            totalDonations: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' },
            uniqueDonors: { $addToSet: '$donorInfo.email' },
            largestDonation: { $max: '$amount' },
            smallestDonation: