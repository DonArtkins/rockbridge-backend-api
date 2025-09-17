const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const { PAYMENT_STATUS } = require("../utils/constants");

const donationSchema = new mongoose.Schema(
  {
    // Ministry Initiative
    ministry: {
      type: String,
      required: true,
      enum: [
        "Holiday Homes",
        "Clean Water Initiative",
        "Workplace Ministry",
        "Lish AI Labs",
        "Upendo Academy",
      ],
      index: true,
    },

    // Donor Information
    donorInfo: {
      firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        index: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
    },

    // Payment Information
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least $1"],
      max: [100000, "Amount cannot exceed $100,000"],
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: "USD",
    },

    paymentStatus: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },

    // Stripe Integration
    stripePaymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripeInvoiceId: String,

    // Transaction Details
    netAmount: {
      type: Number,
      default: function () {
        return this.amount;
      },
    },

    transactionFee: {
      type: Number,
      default: 0,
    },

    // Donation Type
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

    // Donor Preferences
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    message: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    // Processing Status
    processedAt: Date,
    receiptSent: {
      type: Boolean,
      default: false,
    },
    thankYouSent: {
      type: Boolean,
      default: false,
    },

    // Metadata
    source: {
      type: String,
      default: "web",
      enum: ["web", "mobile", "api", "recurring_webhook"],
    },

    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
donationSchema.index({ createdAt: -1 });
donationSchema.index({ "donorInfo.email": 1, createdAt: -1 });
donationSchema.index({ ministry: 1, createdAt: -1 });
donationSchema.index({ paymentStatus: 1, createdAt: -1 });

// Virtual for donor full name
donationSchema.virtual("donorInfo.fullName").get(function () {
  return `${this.donorInfo.firstName} ${this.donorInfo.lastName}`;
});

// Virtual for formatted amount
donationSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: this.currency,
  }).format(this.amount);
});

// Instance methods
donationSchema.methods.markReceiptSent = function () {
  this.receiptSent = true;
  return this.save();
};

donationSchema.methods.markThankYouSent = function () {
  this.thankYouSent = true;
  return this.save();
};

donationSchema.methods.isSuccessful = function () {
  return this.paymentStatus === PAYMENT_STATUS.SUCCEEDED;
};

donationSchema.plugin(mongoosePaginate);

const Donation = mongoose.model("Donation", donationSchema);
module.exports = { Donation };
