const express = require("express");
const router = express.Router();
const pushController = require("../controllers/pushController");
const { authenticateUser } = require("../middleware/auth");
/*
========================================
PUBLIC SUBSCRIBE ROUTE
========================================
*/
router.post("/subscribe", async (req, res) => {
  try {
    console.log("=================================");
    console.log("[SUBSCRIBE REQUEST RECEIVED]");
    console.log(JSON.stringify(req.body, null, 2));
    return pushController.subscribe(req, res);
  } catch (err) {
    console.log("=================================");
    console.log("[SUBSCRIBE ROUTE ERROR]");
    console.log(err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
/*
========================================
PROTECTED SEND ROUTE
========================================
*/
router.post(
  "/send-notification",
  authenticateUser,
  async (req, res) => {
    try {
      console.log("=================================");
      console.log("[SEND NOTIFICATION REQUEST]");
      console.log("[AUTH USER]", req.user);
      return pushController.sendNotification(req, res);
    } catch (err) {
      console.log("=================================");
      console.log("[SEND ROUTE ERROR]");
      console.log(err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
);
/*
========================================
PROTECTED SUBSCRIBERS ROUTE
========================================
*/
router.get(
  "/subscribers",
  authenticateUser,
  async (req, res) => {
    try {
      console.log("=================================");
      console.log("[SUBSCRIBERS REQUEST]");
      console.log("[AUTH USER]", req.user);
      return pushController.getSubscribers(req, res);
    } catch (err) {
      console.log("=================================");
      console.log("[SUBSCRIBERS ROUTE ERROR]");
      console.log(err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
);
module.exports = router;
