const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const donorSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[\d\s\-\(\)]+$/, "Please provide a valid phone number"],
    },
    address: {
      street: String,
      street2: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: "US",
        uppercase: true,
      },
    },
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Donation statistics
    totalDonated: {
      type: Number,
      default: 0,
      min: [0, "Total donated cannot be negative"],
    },
    donationCount: {
      type: Number,
      default: 0,
      min: [0, "Donation count cannot be negative"],
    },
    firstDonationDate: Date,
    lastDonationDate: Date,
    averageDonation: {
      type: Number,
      default: 0,
      min: [0, "Average donation cannot be negative"],
    },
    largestDonation: {
      type: Number,
      default: 0,
      min: [0, "Largest donation cannot be negative"],
    },
    preferredCurrency: {
      type: String,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "CAD", "AUD"],
      uppercase: true,
    },

    // Communication preferences
    communicationPreferences: {
      email: {
        type: Boolean,
        default: true,
      },
      newsletter: {
        type: Boolean,
        default: false,
      },
      updates: {
        type: Boolean,
        default: true,
      },
      taxReceipts: {
        type: Boolean,
        default: true,
      },
      campaignUpdates: {
        type: Boolean,
        default: true,
      },
    },

    // Segmentation and classification
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    donorType: {
      type: String,
      enum: ["first_time", "returning", "recurring", "major_donor", "champion"],
      default: "first_time",
    },
    riskRating: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },

    // Administrative
    notes: {
      type: String,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    blacklistReason: String,

    // Recurring donation info
    activeSubscriptions: [
      {
        stripeSubscriptionId: String,
        campaignId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Campaign",
        },
        amount: Number,
        frequency: String,
        status: String,
        nextPaymentDate: Date,
      },
    ],

    // Metadata
    source: {
      type: String,
      default: "website",
      enum: [
        "website",
        "mobile_app",
        "social_media",
        "email_campaign",
        "referral",
        "other",
      ],
    },
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
donorSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for donation frequency (donations per year)
donorSchema.virtual("donationFrequency").get(function () {
  if (!this.firstDonationDate || this.donationCount === 0) return 0;

  const daysSinceFirst =
    (new Date() - this.firstDonationDate) / (1000 * 60 * 60 * 24);
  const yearsSinceFirst = daysSinceFirst / 365.25;

  return yearsSinceFirst > 0
    ? Math.round(this.donationCount / yearsSinceFirst)
    : this.donationCount;
});

// Virtual for days since last donation
donorSchema.virtual("daysSinceLastDonation").get(function () {
  if (!this.lastDonationDate) return null;
  return Math.floor(
    (new Date() - this.lastDonationDate) / (1000 * 60 * 60 * 24)
  );
});

// Virtual for retention status
donorSchema.virtual("retentionStatus").get(function () {
  const daysSince = this.daysSinceLastDonation;
  if (daysSince === null) return "new";
  if (daysSince <= 30) return "active";
  if (daysSince <= 90) return "at_risk";
  if (daysSince <= 365) return "lapsed";
  return "lost";
});

// Indexes
donorSchema.index({ email: 1 });
donorSchema.index({ stripeCustomerId: 1 });
donorSchema.index({ totalDonated: -1 });
donorSchema.index({ lastDonationDate: -1 });
donorSchema.index({ donorType: 1 });
donorSchema.index({ isActive: 1, isBlacklisted: 1 });
donorSchema.index({ tags: 1 });
donorSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
});

// Add pagination plugin
donorSchema.plugin(mongoosePaginate);

// Pre-save middleware
donorSchema.pre("save", function (next) {
  // Update donor type based on donation history
  if (this.isModified("donationCount") || this.isModified("totalDonated")) {
    if (this.totalDonated >= 1000) {
      this.donorType = "major_donor";
    } else if (this.donationCount >= 12) {
      this.donorType = "champion";
    } else if (
      this.activeSubscriptions &&
      this.activeSubscriptions.length > 0
    ) {
      this.donorType = "recurring";
    } else if (this.donationCount > 1) {
      this.donorType = "returning";
    } else {
      this.donorType = "first_time";
    }
  }

  // Auto-add tags based on donation behavior
  if (this.isModified("totalDonated") || this.isModified("donationCount")) {
    const newTags = new Set(this.tags);

    if (this.totalDonated >= 1000) newTags.add("major_donor");
    if (this.donationCount >= 12) newTags.add("champion");
    if (this.activeSubscriptions && this.activeSubscriptions.length > 0) {
      newTags.add("recurring_donor");
    }

    this.tags = Array.from(newTags);
  }

  next();
});

// Instance methods
donorSchema.methods.updateStats = function (donationAmount) {
  this.totalDonated = Number((this.totalDonated + donationAmount).toFixed(2));
  this.donationCount += 1;
  this.averageDonation = Number(
    (this.totalDonated / this.donationCount).toFixed(2)
  );

  if (donationAmount > this.largestDonation) {
    this.largestDonation = donationAmount;
  }

  this.lastDonationDate = new Date();

  if (!this.firstDonationDate) {
    this.firstDonationDate = new Date();
  }

  return this.save();
};

donorSchema.methods.addSubscription = function (subscriptionData) {
  this.activeSubscriptions.push(subscriptionData);
  return this.save();
};

donorSchema.methods.removeSubscription = function (subscriptionId) {
  this.activeSubscriptions = this.activeSubscriptions.filter(
    (sub) => sub.stripeSubscriptionId !== subscriptionId
  );
  return this.save();
};

donorSchema.methods.blacklist = function (reason) {
  this.isBlacklisted = true;
  this.blacklistReason = reason;
  this.isActive = false;
  return this.save();
};

donorSchema.methods.unblacklist = function () {
  this.isBlacklisted = false;
  this.blacklistReason = undefined;
  this.isActive = true;
  return this.save();
};

module.exports = mongoose.model("Donor", donorSchema);
