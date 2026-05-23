const express = require("express");
const router = express.Router();
const pushController = require("../controllers/pushController");
const { authenticateUser } = require("../middleware/auth");

router.post("/subscribe", pushController.subscribe);

router.post(
  "/send-notification",
  authenticateUser,
  pushController.sendNotification
);

router.get(
  "/subscribers",
  authenticateUser,
  pushController.getSubscribers
);

module.exports = router;
