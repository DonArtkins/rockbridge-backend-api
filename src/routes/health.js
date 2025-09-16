const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");

router.get("/", healthController.getHealthStatus);

router.get("/ping", healthController.ping);

module.exports = router;
