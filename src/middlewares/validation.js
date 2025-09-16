const Joi = require("joi");
const { HTTP_STATUS } = require("../utils/constants");

// Validation middleware factory
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Validation error",
        errors: errorMessages,
      });
    }

    // Replace request property with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Donation validation
  createDonation: Joi.object({
    campaignId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/)
      .message("Campaign ID must be a valid MongoDB ObjectId"),

    amount: Joi.number()
      .required()
      .min(1)
      .max(100000)
      .precision(2)
      .message("Amount must be between $1 and $100,000"),

    currency: Joi.string()
      .valid("USD", "EUR", "GBP", "CAD", "AUD")
      .default("USD"),

    donorInfo: Joi.object({
      firstName: Joi.string().required().trim().max(50),
      lastName: Joi.string().required().trim().max(50),
      email: Joi.string().required().email().lowercase(),
      phone: Joi.string()
        .optional()
        .pattern(/^[\+]?[\d\s\-\(\)]+$/),
      address: Joi.object({
        street: Joi.string().optional(),
        street2: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        postalCode: Joi.string().optional(),
        country: Joi.string().default("US").uppercase(),
      }).optional(),
    }).required(),

    isRecurring: Joi.boolean().default(false),
    recurringFrequency: Joi.when("isRecurring", {
      is: true,
      then: Joi.string().valid("monthly", "quarterly", "annually").required(),
      otherwise: Joi.forbidden(),
    }),

    isAnonymous: Joi.boolean().default(false),
    message: Joi.string().optional().max(1000),

    dedicationType: Joi.string()
      .valid("in_honor", "in_memory", "none")
      .default("none"),

    dedicationName: Joi.when("dedicationType", {
      is: Joi.valid("in_honor", "in_memory"),
      then: Joi.string().required().max(100),
      otherwise: Joi.forbidden(),
    }),
  }),

  // Confirm donation validation
  confirmDonation: Joi.object({
    paymentIntentId: Joi.string().required().pattern(/^pi_/),
    campaignId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
    donorInfo: Joi.object({
      firstName: Joi.string().required().trim().max(50),
      lastName: Joi.string().required().trim().max(50),
      email: Joi.string().required().email().lowercase(),
      phone: Joi.string().optional(),
      address: Joi.object().optional(),
    }).required(),
    amount: Joi.number().required().min(1).max(100000),
    currency: Joi.string()
      .valid("USD", "EUR", "GBP", "CAD", "AUD")
      .default("USD"),
    isRecurring: Joi.boolean().default(false),
    message: Joi.string().optional().max(1000),
  }),

  // Campaign query validation
  campaignQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    category: Joi.string()
      .valid(
        "education",
        "healthcare",
        "infrastructure",
        "emergency",
        "missions",
        "youth",
        "general"
      )
      .optional(),
    status: Joi.string()
      .valid("active", "completed", "paused", "draft")
      .optional(),
    sort: Joi.string().optional(),
    search: Joi.string().optional().max(100),
  }),

  // Donation query validation
  donationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string()
      .valid(
        "pending",
        "processing",
        "succeeded",
        "failed",
        "canceled",
        "refunded"
      )
      .optional(),
    campaignId: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref("startDate")).optional(),
    sort: Joi.string().optional(),
  }),

  // ID parameter validation
  mongoId: Joi.object({
    id: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/)
      .message("ID must be a valid MongoDB ObjectId"),
  }),

  // Slug parameter validation
  slug: Joi.object({
    slug: Joi.string()
      .required()
      .pattern(/^[a-z0-9-]+$/)
      .message(
        "Slug must contain only lowercase letters, numbers, and hyphens"
      ),
  }),
};

module.exports = {
  validate,
  schemas,
};
