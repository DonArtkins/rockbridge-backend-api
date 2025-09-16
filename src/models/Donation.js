const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const donationSchema = new mongoose.Schema(
  {
    donorInfo: {
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
      email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
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
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: [true, "Campaign ID is required"],
    },
    amount: {
      type: Number,
      required: [true, "Donation amount is required"],
      min: [1, "Minimum donation amount is $1"],
      validate: {
        validator: function (value) {
          return Number.isInteger(value * 100);
        },
        message:
          "Amount must be a valid currency amount (max 2 decimal places)",
      },
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "CAD", "AUD"],
      uppercase: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "annually"],
      required: function () {
        return this.isRecurring;
      },
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
      trim: true,
    },
    dedicationType: {
      type: String,
      enum: ["in_honor", "in_memory", "none"],
      default: "none",
    },
    dedicationName: {
      type: String,
      required: function () {
        return this.dedicationType !== "none";
      },
      trim: true,
      maxlength: [100, "Dedication name cannot exceed 100 characters"],
    },

    // Stripe-related fields
    stripePaymentIntentId: {
      type: String,
      required: [true, "Stripe Payment Intent ID is required"],
      unique: true,
      sparse: true,
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "canceled",
        "refunded",
        "requires_action",
      ],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "sepa_debit", "other"],
      default: "card",
    },
    transactionFee: {
      type: Number,
      default: 0,
      min: [0, "Transaction fee cannot be negative"],
    },
    netAmount: {
      type: Number,
      required: [true, "Net amount is required"],
      min: [0, "Net amount cannot be negative"],
    },
    receiptUrl: String,

    // Email tracking
    receiptSent: {
      type: Boolean,
      default: false,
    },
    receiptSentAt: Date,
    thankYouSent: {
      type: Boolean,
      default: false,
    },
    thankYouSentAt: Date,

    // Tax receipt (for annual summaries)
    taxReceiptNumber: String,
    taxReceiptSent: {
      type: Boolean,
      default: false,
    },

    // Processing tracking
    processedAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Metadata
    source: {
      type: String,
      default: "website",
      enum: [
        "website",
        "mobile_app",
        "social_media",
        "email_campaign",
        "other",
      ],
    },
    userAgent: String,
    ipAddress: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          // Simple IP validation (IPv4 and IPv6)
          const ipv4Regex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(v) || ipv6Regex.test(v);
        },
        message: "Invalid IP address format",
      },
    },
    referrer: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.id;
        // Hide sensitive info
        if (ret.donorInfo && ret.isAnonymous) {
          ret.donorInfo = {
            firstName: "Anonymous",
            lastName: "Donor",
          };
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for full donor name
donationSchema.virtual("donorInfo.fullName").get(function () {
  if (this.isAnonymous) return "Anonymous Donor";
  return `${this.donorInfo.firstName} ${this.donorInfo.lastName}`.trim();
});

// Virtual for formatted amount
donationSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: this.currency,
  }).format(this.amount);
});

// Indexes
donationSchema.index({ "donorInfo.email": 1 });
donationSchema.index({ campaignId: 1, createdAt: -1 });
donationSchema.index({ paymentStatus: 1 });
donationSchema.index({ stripePaymentIntentId: 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ isRecurring: 1, recurringFrequency: 1 });
donationSchema.index({ processedAt: 1 }, { sparse: true });

// Add pagination plugin
donationSchema.plugin(mongoosePaginate);

// Pre-save middleware
donationSchema.pre("save", function (next) {
  // Calculate net amount if not provided
  if (!this.netAmount && this.amount && this.transactionFee !== undefined) {
    this.netAmount = Number((this.amount - this.transactionFee).toFixed(2));
  }

  // Set processed timestamp when status changes to succeeded
  if (
    this.isModified("paymentStatus") &&
    this.paymentStatus === "succeeded" &&
    !this.processedAt
  ) {
    this.processedAt = new Date();
  }

  next();
});

// Instance methods
donationSchema.methods.markAsProcessed = function () {
  this.paymentStatus = "succeeded";
  this.processedAt = new Date();
  return this.save();
};

donationSchema.methods.markReceiptSent = function () {
  this.receiptSent = true;
  this.receiptSentAt = new Date();
  return this.save();
};

donationSchema.methods.markThankYouSent = function () {
  this.thankYouSent = true;
  this.thankYouSentAt = new Date();
  return this.save();
};

donationSchema.methods.incrementRetry = function () {
  this.retryCount += 1;
  return this.save();
};

module.exports = mongoose.model("Donation", donationSchema);
