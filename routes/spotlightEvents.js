const express = require('express');
const router = express.Router();
const { recordEvent } = require('../controllers/spotlightEventsController');

router.post("/", recordEvent);

module.exports = router;
