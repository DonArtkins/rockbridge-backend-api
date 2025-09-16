const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../utils/constants');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Mongoose validation errors
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Validation Error: ${errors.join('. ')}`;
  return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
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
  return new AppError('Invalid token. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
};

// Handle JWT expired errors
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
};

// Handle Stripe errors
const handleStripeError = (error) => {
  let message = 'Payment processing failed';
  let statusCode = HTTP_STATUS.BAD_REQUEST;
  
  switch (error.code) {
    case 'card_declined':
      message = 'Your card was declined. Please try a different payment method.';
      break;
    case 'expired_card':
      message = 'Your card has expired. Please use a different card.';
      break;
    case 'insufficient_funds':
      message = 'Insufficient funds. Please check your account balance.';
      break;
    case 'incorrect_cvc':
      message = 'Your card security code is incorrect.';
      break;
    case 'processing_error':
      message = 'An error occurred while processing your payment. Please try again.';
      statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      break;
    case 'rate_