const express = require('express');
const router = express.Router();

// Temporary in-memory storage for proof-of-render
const panels = {};

// POST /api/panels - Save a panel
router.post('/', (req, res) => {
  const { id, title, text, buttonText } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Panel ID is required' });
  }

  panels[id] = { id, title, text, buttonText };

  console.log(`Saved panel: ${id}`);

  res.status(200).json(panels[id]);
});

// GET /api/panels/:id - Fetch a panel
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const panel = panels[id];

  if (!panel) {
    return res.status(404).json({ error: 'Panel not found' });
  }

  res.status(200).json(panel);
});

module.exports = router;
