const logger = require("../utils/logger");

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Create request ID for tracing
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log request start
  logger.info(`${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    contentType: req.get("Content-Type"),
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;

    logger.info(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
      {
        requestId: req.requestId,
        statusCode: res.statusCode,
        duration,
        responseSize: JSON.stringify(data).length,
      }
    );

    return originalJson.call(this, data);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error(`Error in ${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.body,
    params: req.params,
    query: req.query,
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger,
};
