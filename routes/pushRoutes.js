const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authenticateUser } = require('../middleware/auth');

// Public route - No JWT required
router.post('/subscribe', pushController.subscribe);

// Protected routes - Require JWT
router.get('/subscribers/:userId', authenticateUser, pushController.getSubscribers);
router.post('/send-notification', authenticateUser, pushController.sendNotification);

module.exports = router;
