const express = require('express');
const router = express.Router();
const { saveOwnerSubscription } = require('../controllers/ownerSubscriptionController');

router.post('/', saveOwnerSubscription);

module.exports = router;
