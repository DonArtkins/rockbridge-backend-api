const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.NODE_ENV === "test"
        ? process.env.MONGODB_URI_TEST
        : process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MongoDB URI not provided in environment variables");
    }

    const options = {
      maxPoolSize: parseInt(process.env.DATABASE_POOL_SIZE) || 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    const conn = await mongoose.connect(mongoURI, options);

    // Connection event handlers
    mongoose.connection.on("connected", () => {
      logger.info(`📊 MongoDB connected: ${conn.connection.host}`);
    });

    mongoose.connection.on("error", (err) => {
      logger.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("📊 MongoDB disconnected");
    });

    // Handle reconnection
    mongoose.connection.on("reconnected", () => {
      logger.info("📊 MongoDB reconnected");
    });

    return conn;
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info("📊 Database disconnected");
  } catch (error) {
    logger.error("❌ Error disconnecting database:", error);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
