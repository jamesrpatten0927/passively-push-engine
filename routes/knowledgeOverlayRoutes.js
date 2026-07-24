const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { 
  getOverlays, 
  getOverlay, 
  createOverlay, 
  updateOverlay, 
  deleteOverlay,
  getPublicOverlays
} = require('../controllers/knowledgeOverlayController');

// Inline authentication middleware to ensure req.user is populated for the controller
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};

// Public route
router.get('/user/:userId', getPublicOverlays);

// Protected routes
router.use(authenticateToken);
router.get('/', getOverlays);
router.get('/:id', getOverlay);
router.post('/', createOverlay);
router.put('/:id', updateOverlay);
router.delete('/:id', deleteOverlay);

module.exports = router;
