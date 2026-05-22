const express = require("express");
const router = express.Router();
const pushController = require("../controllers/pushController");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

router.post("/subscribe", pushController.subscribe);
router.post(
  "/send-notification",
  requireAuth,
  pushController.sendNotification
);
router.get(
  "/subscribers",
  requireAuth,
  pushController.getSubscribers
);

module.exports = router;