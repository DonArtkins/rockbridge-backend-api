const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  throw new Error("Gmail credentials not provided in environment variables");
}

const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  pool: true, // Use pooled connections
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000, // 1 second between messages
  rateLimit: 5, // Max 5 messages per rateDelta
});

// Test email connection
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    logger.info("📧 Email service connected successfully");
  } catch (error) {
    logger.error("❌ Email service connection failed:", error);
    throw error;
  }
};

// Email configuration
const emailConfig = {
  from: {
    name: process.env.EMAIL_FROM_NAME || "Rockbridge Ministries",
    address: process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER,
  },
  adminEmail: process.env.ADMIN_EMAIL || "admin@rockbridgeministries.org",
  replyTo: process.env.ADMIN_EMAIL || "admin@rockbridgeministries.org",
};

module.exports = {
  transporter,
  testEmailConnection,
  emailConfig,
};
