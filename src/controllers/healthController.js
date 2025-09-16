const mongoose = require("mongoose");
const { testStripeConnection } = require("../config/stripe");
const { testEmailConnection } = require("../config/email");
const { HTTP_STATUS } = require("../utils/constants");

class HealthController {
  // Detailed health check
  async getHealthStatus(req, res, next) {
    try {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        services: {},
      };

      // Check database connection
      try {
        await mongoose.connection.db.admin().ping();
        health.services.database = "connected";
      } catch (error) {
        health.services.database = "disconnected";
        health.status = "unhealthy";
      }

      // Check Stripe connection
      try {
        await testStripeConnection();
        health.services.stripe = "configured";
      } catch (error) {
        health.services.stripe = "error";
        health.status = "degraded";
      }

      // Check email service
      try {
        await testEmailConnection();
        health.services.email = "configured";
      } catch (error) {
        health.services.email = "error";
        health.status = "degraded";
      }

      const statusCode =
        health.status === "healthy"
          ? HTTP_STATUS.OK
          : HTTP_STATUS.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(health);
    } catch (error) {
      next(error);
    }
  }

  // Simple health check for load balancers
  async ping(req, res) {
    res.status(HTTP_STATUS.OK).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new HealthController();
