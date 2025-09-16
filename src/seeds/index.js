const mongoose = require("mongoose");
require("dotenv").config();
const { seedCampaignsData } = require("./campaigns");
const logger = require("../utils/logger");

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/rockbridge-donations",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    logger.info("Connected to MongoDB for seeding");

    // Run all seed functions
    await seedCampaignsData();

    logger.info("Database seeding completed successfully");

    // Close connection
    await mongoose.connection.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error seeding database:", error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
};
