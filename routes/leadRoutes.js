const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

// Create a new lead
router.post('/', leadController.createLead);

// Get leads for a user
router.get('/', leadController.getLeads);

module.exports = router;
