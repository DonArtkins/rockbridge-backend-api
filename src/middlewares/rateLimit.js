const rateLimit = require("express-rate-limit");

// Define constants directly if import fails
let HTTP_STATUS, RATE_LIMITS;

try {
  const constants = require("../utils/constants");
  HTTP_STATUS = constants.HTTP_STATUS;
  RATE_LIMITS = constants.RATE_LIMITS;
} catch (error) {
  console.log("Constants file not found, using default values");
  // Fallback constants
  HTTP_STATUS = {
    TOO_MANY_REQUESTS: 429,
  };
  RATE_LIMITS = {
    GENERAL_WINDOW: 15 * 60 * 1000, // 15 minutes
    GENERAL_MAX_REQUESTS: 100,
    DONATION_WINDOW: 15 * 60 * 1000,
    DONATION_MAX_ATTEMPTS: 5,
  };
}

// Redis client (optional - falls back to memory store)
let store;

try {
  if (process.env.REDIS_URL) {
    const redis = require("redis");
    const RedisStore = require("rate-limit-redis");
    const redisClient = redis.createClient(process.env.REDIS_URL);
    store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    });
    console.log("Using Redis store for rate limiting");
  } else {
    console.log("Redis not configured, using memory store for rate limiting");
    store = undefined;
  }
} catch (error) {
  console.log(
    "Redis setup failed, using memory store for rate limiting:",
    error.message
  );
  store = undefined;
}

// Custom rate limit message
const rateLimitMessage = {
  success: false,
  message: "Too many requests from this IP, please try again later",
  retryAfter: "15 minutes",
};

// General rate limiter with error handling
let globalRateLimit;
try {
  globalRateLimit = rateLimit({
    windowMs: RATE_LIMITS.GENERAL_WINDOW || 15 * 60 * 1000,
    max: RATE_LIMITS.GENERAL_MAX_REQUESTS || 100,
    message: rateLimitMessage,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS || 429).json({
        ...rateLimitMessage,
        resetTime: new Date(
          Date.now() + (RATE_LIMITS.GENERAL_WINDOW || 15 * 60 * 1000)
        ),
      });
    },
  });
  console.log("Global rate limit middleware created successfully");
} catch (error) {
  console.error("Failed to create globalRateLimit:", error);
  // Fallback middleware that does nothing
  globalRateLimit = (req, res, next) => next();
}

// Strict rate limiter for donations with error handling
let donationRateLimit;
try {
  donationRateLimit = rateLimit({
    windowMs: RATE_LIMITS.DONATION_WINDOW || 15 * 60 * 1000,
    max: RATE_LIMITS.DONATION_MAX_ATTEMPTS || 5,
    message: {
      success: false,
      message: "Too many donation attempts. Please wait before trying again.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: (req) => {
      const email = req.body?.donorInfo?.email || "anonymous";
      return `donation:${req.ip}:${email}`;
    },
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS || 429).json({
        success: false,
        message:
          "Too many donation attempts. Please wait 15 minutes before trying again.",
        resetTime: new Date(
          Date.now() + (RATE_LIMITS.DONATION_WINDOW || 15 * 60 * 1000)
        ),
      });
    },
  });
  console.log("Donation rate limit middleware created successfully");
} catch (error) {
  console.error("Failed to create donationRateLimit:", error);
  donationRateLimit = (req, res, next) => next();
}

// Webhook rate limiter with error handling
let webhookRateLimit;
try {
  webhookRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute
    message: {
      success: false,
      message: "Webhook rate limit exceeded",
    },
    standardHeaders: false,
    legacyHeaders: false,
    store,
  });
  console.log("Webhook rate limit middleware created successfully");
} catch (error) {
  console.error("Failed to create webhookRateLimit:", error);
  webhookRateLimit = (req, res, next) => next();
}

// Debug the middleware functions before exporting
console.log("Rate limit middleware status:");
console.log("- globalRateLimit:", typeof globalRateLimit);
console.log("- donationRateLimit:", typeof donationRateLimit);
console.log("- webhookRateLimit:", typeof webhookRateLimit);

module.exports = {
  globalRateLimit,
  donationRateLimit,
  webhookRateLimit,
};
