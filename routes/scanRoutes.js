const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

// Save or update scan results
router.post('/', scanController.saveScan);

// Get scan results for a user
router.get('/user/:userId', scanController.getScan);

module.exports = router;
