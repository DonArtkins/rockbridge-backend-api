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

// Custom validation for flexible amount handling
const amountValidator = (value, helpers) => {
  // Handle both cents and dollars
  let amount = value;

  // If amount is greater than 100,000, assume it's in cents and convert to dollars
  if (amount > 100000) {
    amount = Math.round(amount / 100);
  }

  // Validate the final amount is in valid range
  if (amount < 1 || amount > 100000) {
    return helpers.message("Amount must be between $1 and $100,000");
  }

  return amount; // Return the normalized amount
};

// Common validation schemas
const schemas = {
  // Donation validation
  createDonation: Joi.object({
    ministry: Joi.string()
      .required()
      .valid(
        "Holiday Homes",
        "Clean Water Initiative",
        "Workplace Ministry",
        "Lish AI Labs",
        "Upendo Academy"
      )
      .messages({
        "any.only": "Please select a valid ministry initiative",
      }),

    amount: Joi.number()
      .required()
      .custom(amountValidator)
      .message("Amount must be a valid number between $1 and $100,000"),

    currency: Joi.string()
      .valid("USD", "EUR", "GBP", "CAD", "AUD")
      .default("USD"),

    donorInfo: Joi.object({
      firstName: Joi.string().required().trim().max(50).messages({
        "string.empty": "First name is required",
        "any.required": "First name is required",
      }),
      lastName: Joi.string().required().trim().max(50).messages({
        "string.empty": "Last name is required",
        "any.required": "Last name is required",
      }),
      email: Joi.string().required().email().lowercase().messages({
        "string.email": "Please provide a valid email address",
        "string.empty": "Email address is required",
        "any.required": "Email address is required",
      }),
      phone: Joi.string()
        .optional()
        .pattern(/^[\+]?[\d\s\-\(\)]+$/)
        .allow(""),
      postalCode: Joi.string().required().min(3).max(20).messages({
        "string.empty": "Postal code is required",
        "any.required": "Postal code is required",
      }),
    }).required(),

    isRecurring: Joi.boolean().default(false),
    recurringFrequency: Joi.when("isRecurring", {
      is: true,
      then: Joi.string().valid("monthly", "quarterly", "annually").required(),
      otherwise: Joi.forbidden(),
    }),

    isAnonymous: Joi.boolean().default(false),
    message: Joi.string().optional().max(1000).allow(""),
  }),

  // Confirm donation validation - more flexible for frontend data
  confirmDonation: Joi.object({
    paymentIntentId: Joi.string().required().pattern(/^pi_/).messages({
      "string.pattern.base": "Invalid payment intent ID format",
      "any.required": "Payment intent ID is required",
    }),
    ministry: Joi.string()
      .required()
      .valid(
        "Holiday Homes",
        "Clean Water Initiative",
        "Workplace Ministry",
        "Lish AI Labs",
        "Upendo Academy"
      ),
    donorInfo: Joi.object({
      firstName: Joi.string().required().trim().max(50),
      lastName: Joi.string().required().trim().max(50),
      email: Joi.string().required().email().lowercase(),
      phone: Joi.string().optional().allow(""),
      postalCode: Joi.string().required(),
    }).required(),
    amount: Joi.number().required().min(1).max(10000000), // More flexible for confirmation
    currency: Joi.string()
      .valid("USD", "EUR", "GBP", "CAD", "AUD")
      .default("USD"),
    isRecurring: Joi.boolean().default(false),
    message: Joi.string().optional().max(1000).allow(""),
  }),

  // Query validation for donations list
  donationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    ministry: Joi.string().valid(
      "Holiday Homes",
      "Clean Water Initiative",
      "Workplace Ministry",
      "Lish AI Labs",
      "Upendo Academy"
    ),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")),
    paymentStatus: Joi.string().valid(
      "pending",
      "succeeded",
      "failed",
      "canceled"
    ),
    minAmount: Joi.number().min(0),
    maxAmount: Joi.number().min(Joi.ref("minAmount")),
  }),

  // ID parameter validation
  mongoId: Joi.object({
    id: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/)
      .message("ID must be a valid MongoDB ObjectId"),
  }),
};

module.exports = {
  validate,
  schemas,
};
