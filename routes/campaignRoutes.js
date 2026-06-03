const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateUser } = require('../middleware/auth');

// Public Endpoint (Used by widget.js Spotlight Runtime)
// No JWT required, read-only
router.get('/spotlights/public/:panelId', campaignController.getPublicCampaigns);

// Protected Endpoints (Used by Advisor Studio / Campaign Center)
// Requires JWT
router.use('/campaigns', authenticateUser);
router.get('/campaigns/:panelId', campaignController.getCampaigns);
router.post('/campaigns', campaignController.saveCampaign);
router.delete('/campaigns/:id', campaignController.deleteCampaign);

router.use('/schedules', authenticateUser);
router.get('/schedules/:panelId', campaignController.getSchedules);
router.post('/schedules', campaignController.saveSchedule);
router.delete('/schedules/:id', campaignController.deleteSchedule);

module.exports = router;
