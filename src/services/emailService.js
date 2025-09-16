const path = require("path");
const fs = require("fs").promises;
const { transporter, emailConfig } = require("../config/email");
const logger = require("../utils/logger");
const { formatCurrency, formatDate } = require("../utils/helpers");

class EmailService {
  // Load and compile email template
  async loadTemplate(templateName, data) {
    try {
      const templatePath = path.join(
        __dirname,
        "../templates",
        `${templateName}.html`
      );
      let template = await fs.readFile(templatePath, "utf-8");

      // Replace template variables
      Object.keys(data).forEach((key) => {
        const placeholder = new RegExp(`{{${key}}}`, "g");
        template = template.replace(placeholder, data[key] || "");
      });

      return template;
    } catch (error) {
      logger.error("Failed to load email template:", error);
      throw new Error(`Failed to load email template: ${error.message}`);
    }
  }

  // Send donation receipt
  async sendDonationReceipt(donation) {
    try {
      await donation.populate("campaignId", "title");

      const templateData = {
        firstName: donation.donorInfo.firstName,
        lastName: donation.donorInfo.lastName,
        fullName: donation.donorInfo.fullName,
        amount: formatCurrency(donation.amount, donation.currency),
        campaignTitle: donation.campaignId.title,
        donationDate: formatDate(donation.createdAt, "MMMM DD, YYYY"),
        transactionId: donation.stripePaymentIntentId,
        receiptNumber: donation._id.toString().slice(-8).toUpperCase(),
        donationType: donation.isRecurring
          ? "Recurring Donation"
          : "One-time Donation",
        frequency: donation.recurringFrequency || "N/A",
        message: donation.message || "",
        organizationName: "Rockbridge Ministries",
        organizationAddress: "123 Ministry Way, Faith City, FC 12345",
        supportEmail: emailConfig.adminEmail,
      };

      const template = await this.loadTemplate(
        "donation-receipt",
        templateData
      );

      const mailOptions = {
        from: {
          name: emailConfig.from.name,
          address: emailConfig.from.address,
        },
        to: donation.donorInfo.email,
        subject: "Thank you for your donation - Receipt",
        html: template,
        replyTo: emailConfig.replyTo,
      };

      const result = await transporter.sendMail(mailOptions);

      // Update donation record
      await donation.markReceiptSent();

      logger.info(`Receipt email sent to ${donation.donorInfo.email}`, {
        donationId: donation._id,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error("Failed to send receipt email:", error);
      throw new Error(`Failed to send receipt email: ${error.message}`);
    }
  }

  // Send thank you email
  async sendThankYouEmail(donation) {
    try {
      await donation.populate("campaignId", "title description");

      const templateData = {
        firstName: donation.donorInfo.firstName,
        lastName: donation.donorInfo.lastName,
        amount: formatCurrency(donation.amount, donation.currency),
        campaignTitle: donation.campaignId.title,
        campaignDescription:
          donation.campaignId.description.substring(0, 200) + "...",
        isRecurring: donation.isRecurring,
        donationType: donation.isRecurring ? "recurring" : "one-time",
        message: donation.message || "",
        organizationName: "Rockbridge Ministries",
        supportEmail: emailConfig.adminEmail,
        websiteUrl:
          process.env.FRONTEND_URL || "https://rockbridgeministries.org",
      };

      const template = await this.loadTemplate("thank-you", templateData);

      const mailOptions = {
        from: {
          name: emailConfig.from.name,
          address: emailConfig.from.address,
        },
        to: donation.donorInfo.email,
        subject: "Thank you for your generous support! 🙏",
        html: template,
        replyTo: emailConfig.replyTo,
      };

      const result = await transporter.sendMail(mailOptions);

      // Update donation record
      await donation.markThankYouSent();

      logger.info(`Thank you email sent to ${donation.donorInfo.email}`, {
        donationId: donation._id,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error("Failed to send thank you email:", error);
      throw new Error(`Failed to send thank you email: ${error.message}`);
    }
  }

  // Send donation notification to admin
  async sendDonationNotification(donation) {
    try {
      await donation.populate("campaignId", "title");

      const templateData = {
        donorName: donation.donorInfo.fullName,
        donorEmail: donation.donorInfo.email,
        amount: formatCurrency(donation.amount, donation.currency),
        campaignTitle: donation.campaignId.title,
        donationType: donation.isRecurring ? "Recurring" : "One-time",
        frequency: donation.recurringFrequency || "N/A",
        donationDate: formatDate(
          donation.createdAt,
          "MMMM DD, YYYY [at] h:mm A"
        ),
        message: donation.message || "No message provided",
        transactionId: donation.stripePaymentIntentId,
        donationId: donation._id.toString(),
      };

      const template = await this.loadTemplate(
        "donation-notification",
        templateData
      );

      const mailOptions = {
        from: emailConfig.from.address,
        to: emailConfig.adminEmail,
        subject: `🎉 New Donation Received - ${formatCurrency(
          donation.amount,
          donation.currency
        )}`,
        html: template,
      };

      const result = await transporter.sendMail(mailOptions);

      logger.info(`Admin notification sent for donation ${donation._id}`, {
        donationId: donation._id,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error("Failed to send admin notification:", error);
      // Don't throw error for admin notifications to avoid affecting user experience
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      await transporter.verify();
      return {
        success: true,
        message: "Email service is configured correctly",
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();
