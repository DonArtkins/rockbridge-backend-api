const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Campaign title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Campaign slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
    },
    description: {
      type: String,
      required: [true, "Campaign description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    goalAmount: {
      type: Number,
      required: [true, "Goal amount is required"],
      min: [1, "Goal amount must be at least $1"],
      validate: {
        validator: function (value) {
          return Number.isInteger(value * 100); // Ensure it's valid currency
        },
        message:
          "Goal amount must be a valid currency amount (max 2 decimal places)",
      },
    },
    raisedAmount: {
      type: Number,
      default: 0,
      min: [0, "Raised amount cannot be negative"],
      validate: {
        validator: function (value) {
          return Number.isInteger(value * 100);
        },
        message: "Raised amount must be a valid currency amount",
      },
    },
    currency: {
      type: String,
      default: "USD",
      enum: {
        values: ["USD", "EUR", "GBP", "CAD", "AUD"],
        message: "Currency must be one of: USD, EUR, GBP, CAD, AUD",
      },
      uppercase: true,
    },
    featuredImage: {
      type: String,
      required: [true, "Featured image is required"],
      validate: {
        validator: function (value) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(value);
        },
        message: "Featured image must be a valid image URL",
      },
    },
    gallery: [
      {
        url: {
          type: String,
          validate: {
            validator: function (value) {
              return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(value);
            },
            message: "Gallery image must be a valid image URL",
          },
        },
        caption: {
          type: String,
          maxlength: [200, "Caption cannot exceed 200 characters"],
        },
      },
    ],
    category: {
      type: String,
      enum: {
        values: [
          "education",
          "healthcare",
          "infrastructure",
          "emergency",
          "missions",
          "youth",
          "general",
        ],
        message: "Invalid category",
      },
      default: "general",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "completed", "paused", "draft"],
        message: "Status must be one of: active, completed, paused, draft",
      },
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    donorCount: {
      type: Number,
      default: 0,
      min: [0, "Donor count cannot be negative"],
    },
    stripeProductId: {
      type: String,
      sparse: true,
    },
    metadata: {
      type: Map,
      of: String,
      default: new Map(),
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
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

// Virtual for progress percentage
campaignSchema.virtual("progressPercentage").get(function () {
  if (!this.goalAmount || this.goalAmount === 0) return 0;
  return Math.min(Math.round((this.raisedAmount / this.goalAmount) * 100), 100);
});

// Virtual for remaining amount
campaignSchema.virtual("remainingAmount").get(function () {
  return Math.max(this.goalAmount - this.raisedAmount, 0);
});

// Virtual for days remaining
campaignSchema.virtual("daysRemaining").get(function () {
  if (!this.endDate) return null;
  const now = new Date();
  const diffTime = this.endDate - now;
  return diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
});

// Virtual for campaign status
campaignSchema.virtual("campaignStatus").get(function () {
  const now = new Date();

  if (this.status === "draft") return "draft";
  if (this.status === "paused") return "paused";
  if (this.progressPercentage >= 100) return "goal_reached";
  if (this.endDate && now > this.endDate) return "ended";
  if (now < this.startDate) return "upcoming";

  return "active";
});

// Indexes for performance
campaignSchema.index({ status: 1, category: 1 });
campaignSchema.index({ slug: 1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ priority: -1, createdAt: -1 });
campaignSchema.index({ isUrgent: -1, priority: -1 });
campaignSchema.index(
  {
    title: "text",
    description: "text",
    shortDescription: "text",
  },
  {
    weights: { title: 10, shortDescription: 5, description: 1 },
  }
);

// Add pagination plugin
campaignSchema.plugin(mongoosePaginate);

// Pre-save middleware
campaignSchema.pre("save", function (next) {
  // Auto-complete campaign if goal reached
  if (this.raisedAmount >= this.goalAmount && this.status === "active") {
    this.status = "completed";
  }

  // Generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }

  next();
});

// Instance methods
campaignSchema.methods.updateProgress = function (donationAmount) {
  this.raisedAmount = Number((this.raisedAmount + donationAmount).toFixed(2));
  this.donorCount += 1;

  if (this.raisedAmount >= this.goalAmount && this.status === "active") {
    this.status = "completed";
  }

  return this.save();
};

campaignSchema.methods.canReceiveDonations = function () {
  const now = new Date();
  return (
    this.status === "active" &&
    (!this.endDate || now <= this.endDate) &&
    now >= this.startDate
  );
};

module.exports = mongoose.model("Campaign", campaignSchema);
