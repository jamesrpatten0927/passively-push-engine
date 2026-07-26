const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  reorderCategories,
  getPublicCategories
} = require('../controllers/knowledgeCategoryController');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

router.get('/', authenticateToken, getCategories);
router.post('/', authenticateToken, createCategory);
router.post('/reorder', authenticateToken, reorderCategories);
router.put('/:id', authenticateToken, updateCategory);
router.delete('/:id', authenticateToken, deleteCategory);
router.get('/public/:userId', getPublicCategories);

module.exports = router;
