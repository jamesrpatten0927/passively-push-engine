const express = require('express');
const router = express.Router();
const journeyController = require('../controllers/journeyController');

router.post('/', journeyController.createJourney);
router.get('/user/:userId', journeyController.getUserJourneys);
router.put('/:journeyId', journeyController.updateJourney);
router.delete('/:journeyId', journeyController.deleteJourney);

module.exports = router;
