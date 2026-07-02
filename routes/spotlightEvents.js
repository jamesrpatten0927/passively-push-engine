const express = require('express');
const router = express.Router();
const { recordEvent, getEventsByUser } = require('../controllers/spotlightEventsController');

router.post('/events', recordEvent);
router.get('/events/user/:userId', getEventsByUser);

module.exports = router;
