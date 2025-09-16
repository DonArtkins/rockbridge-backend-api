const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Define JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  }),
];

// Add file transports only in production or when explicitly requested
if (
  process.env.NODE_ENV === "production" ||
  process.env.LOG_TO_FILE === "true"
) {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      format: jsonFormat,
      maxSize: process.env.LOG_FILE_MAX_SIZE || "20m",
      maxFiles: process.env.LOG_FILE_MAX_FILES || "14d",
      zippedArchive: true,
      auditFile: path.join(logsDir, "error-audit.json"),
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: jsonFormat,
      maxSize: process.env.LOG_FILE_MAX_SIZE || "20m",
      maxFiles: process.env.LOG_FILE_MAX_FILES || "14d",
      zippedArchive: true,
      auditFile: path.join(logsDir, "combined-audit.json"),
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: process.env.NODE_ENV === "production" ? jsonFormat : logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === "production"
      ? [
          new DailyRotateFile({
            filename: path.join(logsDir, "exceptions-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            format: jsonFormat,
            maxSize: "20m",
            maxFiles: "14d",
          }),
        ]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === "production"
      ? [
          new DailyRotateFile({
            filename: path.join(logsDir, "rejections-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            format: jsonFormat,
            maxSize: "20m",
            maxFiles: "14d",
          }),
        ]
      : []),
  ],
});

// Add request logging helper
logger.logRequest = (req, res) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 400) {
      logger.warn(message, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } else {
      logger.info(message, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
      });
    }
  });
};

module.exports = logger;
