require("dotenv").config();
const app = require("./src/app");
const logger = require("./src/utils/logger");
const { connectDB } = require("./src/config/database");

const PORT = process.env.PORT || 5000;

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  server.close(() => {
    process.exit(1);
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Rockbridge API Server running on port ${PORT}`);
      logger.info(`📖 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`📴 ${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        try {
          const mongoose = require("mongoose");
          await mongoose.connection.close();
          logger.info("✅ Database connection closed");
          logger.info("✅ Server shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error("❌ Error during shutdown:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
