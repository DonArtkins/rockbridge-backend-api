const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Get detailed health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get("/", healthController.getHealthStatus);

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Simple ping endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Pong
 */
router.get("/ping", healthController.ping);

module.exports = router;
