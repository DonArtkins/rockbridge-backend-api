const { config } = require("../config");

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    // Check if the origin is in the allowed list
    if (
      config.corsOrigins.includes(origin) ||
      config.corsOrigins.includes("*")
    ) {
      return callback(null, true);
    }

    // In development, allow localhost with any port
    if (config.nodeEnv === "development" && origin.includes("localhost")) {
      return callback(null, true);
    }

    // Reject the origin
    const error = new Error(`Origin ${origin} not allowed by CORS policy`);
    error.statusCode = 403;
    callback(error, false);
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Forwarded-For",
  ],

  exposedHeaders: [
    "X-Total-Count",
    "X-Total-Pages",
    "X-Current-Page",
    "X-Rate-Limit-Limit",
    "X-Rate-Limit-Remaining",
    "X-Rate-Limit-Reset",
  ],

  credentials: true, // Allow cookies and authorization headers

  // How long browsers can cache preflight responses (in seconds)
  maxAge: 86400, // 24 hours

  // Don't provide success status for legacy browsers
  optionsSuccessStatus: 200,

  // Handle preflight requests
  preflightContinue: false,
};

module.exports = corsOptions;
