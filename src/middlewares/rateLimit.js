const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { HTTP_STATUS, RATE_LIMITS } = require("../utils/constants");

// Redis client (optional - falls back to memory store)
let redisClient;
try {
  if (process.env.REDIS_URL) {
    const redis = require("redis");
    redisClient = redis.createClient(process.env.REDIS_URL);
  }
} catch (error) {
  console.log("Redis not available, using memory store for rate limiting");
}

// Create rate limit store
const store = redisClient
  ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    })
  : undefined;

// Custom rate limit message
const rateLimitMessage = {
  success: false,
  message: "Too many requests from this IP, please try again later",
  retryAfter: "15 minutes",
};

// General rate limiter
const globalRateLimit = rateLimit({
  windowMs: RATE_LIMITS.GENERAL_WINDOW,
  max: RATE_LIMITS.GENERAL_MAX_REQUESTS,
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
  store,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      ...rateLimitMessage,
      resetTime: new Date(Date.now() + RATE_LIMITS.GENERAL_WINDOW),
    });
  },
});

// Strict rate limiter for donations
const donationRateLimit = rateLimit({
  windowMs: RATE_LIMITS.DONATION_WINDOW,
  max: RATE_LIMITS.DONATION_MAX_ATTEMPTS,
  message: {
    success: false,
    message: "Too many donation attempts. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: (req) => {
    // Rate limit by IP and email combination for donations
    const email = req.body?.donorInfo?.email || "anonymous";
    return `donation:${req.ip}:${email}`;
  },
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message:
        "Too many donation attempts. Please wait 15 minutes before trying again.",
      resetTime: new Date(Date.now() + RATE_LIMITS.DONATION_WINDOW),
    });
  },
});

// Webhook rate limiter (more lenient for legitimate webhooks)
const webhookRateLimit = rateLimit({
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

module.exports = {
  globalRateLimit,
  donationRateLimit,
  webhookRateLimit,
};
