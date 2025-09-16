const logger = require("../utils/logger");
const { HTTP_STATUS, ERROR_CODES } = require("../utils/constants");

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Mongoose validation errors
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map((err) => err.message);
  const message = `Validation Error: ${errors.join(". ")}`;
  return new AppError(
    message,
    HTTP_STATUS.BAD_REQUEST,
    ERROR_CODES.VALIDATION_ERROR
  );
};

// Handle Mongoose duplicate key errors
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `Duplicate value for ${field}: ${value}. Please use another value.`;
  return new AppError(message, HTTP_STATUS.CONFLICT);
};

// Handle Mongoose cast errors
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, HTTP_STATUS.BAD_REQUEST);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError(
    "Invalid token. Please log in again.",
    HTTP_STATUS.UNAUTHORIZED
  );
};

// Handle JWT expired errors
const handleJWTExpiredError = () => {
  return new AppError(
    "Your token has expired. Please log in again.",
    HTTP_STATUS.UNAUTHORIZED
  );
};

// Handle Stripe errors
const handleStripeError = (error) => {
  let message = "Payment processing failed";
  let statusCode = HTTP_STATUS.BAD_REQUEST;

  switch (error.code) {
    case "card_declined":
      message =
        "Your card was declined. Please try a different payment method.";
      break;
    case "expired_card":
      message = "Your card has expired. Please use a different card.";
      break;
    case "insufficient_funds":
      message = "Insufficient funds. Please check your account balance.";
      break;
    case "incorrect_cvc":
      message = "Your card security code is incorrect.";
      break;
    case "processing_error":
      message =
        "An error occurred while processing your payment. Please try again.";
      statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      break;
    case "rate_limit":
      message = "Too many requests. Please try again later.";
      statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
      break;
    default:
      message = `Payment error: ${error.message}`;
  }

  return new AppError(message, statusCode, ERROR_CODES.STRIPE_ERROR);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      stack: err.stack,
      errorCode: err.errorCode,
    },
    statusCode: err.statusCode,
    status: err.status,
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error("Unknown error:", err);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong. Please try again later.",
      errorCode: ERROR_CODES.INTERNAL_ERROR,
    });
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error ${err.message}`, {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    error = handleCastError(error);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = handleDuplicateKeyError(error);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    error = handleValidationError(error);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }

  // JWT expired error
  if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  // Stripe errors
  if (err.type && err.type.startsWith("Stripe")) {
    error = handleStripeError(error);
  }

  // Express-validator errors
  if (err.array && typeof err.array === "function") {
    const messages = err
      .array()
      .map((error) => error.msg)
      .join(". ");
    error = new AppError(
      messages,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Send response
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Handle 404 errors
const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  const error = new AppError(message, HTTP_STATUS.NOT_FOUND);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
