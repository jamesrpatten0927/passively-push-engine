const express = require('express');
const router = express.Router();
const spotlightController = require('../controllers/spotlightController');

// Create a new spotlight
router.post('/', spotlightController.createSpotlight);

// Get all spotlights for a specific user (optionally filter by ?status=active)
router.get('/user/:userId', spotlightController.getUserSpotlights);

// Get a specific spotlight by ID
router.get('/:spotlightId', spotlightController.getSpotlight);

// Update a spotlight
router.put('/:spotlightId', spotlightController.updateSpotlight);

// Delete a spotlight
router.delete('/:spotlightId', spotlightController.deleteSpotlight);

// Toggle spotlight status (e.g. active/inactive/draft)
router.patch('/:spotlightId/status', spotlightController.updateSpotlightStatus);

module.exports = router;
