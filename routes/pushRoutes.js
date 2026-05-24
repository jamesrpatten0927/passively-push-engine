const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const pushController = require("../controllers/pushController");
const { authenticateUser } = require("../middleware/auth");
const db = require("../config/db");

/*
========================================
PUBLIC SUBSCRIBE ROUTE
========================================
*/
router.post("/subscribe", async (req, res) => {
  try {
    console.log("=================================");
    console.log("[SUBSCRIBE REQUEST RECEIVED]");
    console.log("[HEADERS]");
    console.log(req.headers);

    console.log("[BODY]");
    console.log(JSON.stringify(req.body, null, 2));

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[SUBSCRIBE ERROR] Missing Authorization Header");

      return res.status(401).json({
        success: false,
        error: "Missing Authorization Header"
      });
    }

    const token = authHeader.split(" ")[1];

    console.log("[JWT TOKEN]");
    console.log(token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("[JWT VERIFIED]");
    console.log(decoded);

    const subscription = req.body.subscription || req.body;

    if (!subscription || !subscription.endpoint) {
      console.log("[SUBSCRIBE ERROR] Invalid Subscription Object");

      return res.status(400).json({
        success: false,
        error: "Invalid Subscription Object"
      });
    }

    console.log("[SAVING SUBSCRIPTION]");
    console.log(subscription);

    db.data.subscribers.push({
      id: Date.now().toString(),
      user_id: decoded.user_id,
      subscription,
      created_at: new Date().toISOString()
    });

    await db.write();

    console.log("[SUBSCRIPTION SAVED SUCCESSFULLY]");

    return res.status(200).json({
      success: true,
      message: "Subscription Saved Successfully"
    });

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
      console.log("[AUTH USER]");
      console.log(req.user);

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
      console.log("[AUTH USER]");
      console.log(req.user);

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
