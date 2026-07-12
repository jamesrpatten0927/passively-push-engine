const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/platform-metrics', requireAdmin, adminController.getPlatformMetrics);
router.get('/users', requireAdmin, adminController.getUsers);

module.exports = router;
