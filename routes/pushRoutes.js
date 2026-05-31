const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authenticateUser } = require('../middleware/auth');
// Public route - NO JWT REQUIRED for visitors
router.post('/subscribe', pushController.subscribe);
// Protected routes - Require JWT (authenticateUser) for dashboard owner
router.get('/subscribers/:userId', authenticateUser, pushController.getSubscribers);
router.post('/send-notification', authenticateUser, pushController.sendNotification);
module.exports = router;
