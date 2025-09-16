const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

// Security middleware for input validation and sanitization
const securityMiddleware = (req, res, next) => {
  // Remove potentially dangerous characters from query params
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === "string") {
        req.query[key] = req.query[key].replace(/[<>]/g, "");
      }
    });
  }

  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Remove potentially sensitive headers
  res.removeHeader("X-Powered-By");

  next();
};

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
  delayMs: 500, // Add 500ms delay after limit is reached
  maxDelayMs: 20000, // Max delay of 20 seconds
});

// IP whitelist middleware (for admin operations)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === "development") {
      return next(); // Skip in development
    }

    const clientIP = req.ip || req.connection.remoteAddress;

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: "Access denied from your IP address",
      });
    }

    next();
  };
};

module.exports = {
  securityMiddleware,
  speedLimiter,
  ipWhitelist,
};
