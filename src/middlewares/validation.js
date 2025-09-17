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
        .pattern(/^[\+]?[\d\s\-\(\)]+$/)
        .allow(""),
      postalCode: Joi.string().required().min(3).max(20),
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

  // Confirm donation validation
  confirmDonation: Joi.object({
    paymentIntentId: Joi.string().required().pattern(/^pi_/),
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
    amount: Joi.number().required().min(1).max(100000),
    currency: Joi.string()
      .valid("USD", "EUR", "GBP", "CAD", "AUD")
      .default("USD"),
    isRecurring: Joi.boolean().default(false),
    message: Joi.string().optional().max(1000).allow(""),
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
