const express = require('express');
const router = express.Router();
const { 
  getOverlays, 
  getOverlay, 
  createOverlay, 
  updateOverlay, 
  deleteOverlay,
  getPublicOverlays
} = require('../controllers/knowledgeOverlayController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public endpoint (no auth required)
router.get('/user/:userId', getPublicOverlays);

// Protected routes (auth required)
router.use(authenticateToken);
router.get('/', getOverlays);
router.get('/:id', getOverlay);
router.post('/', createOverlay);
router.put('/:id', updateOverlay);
router.delete('/:id', deleteOverlay);

module.exports = router;
