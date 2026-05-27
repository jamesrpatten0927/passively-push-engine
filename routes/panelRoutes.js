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
2. Mount it in server.js (in your backend repo)
const express = require('express');
const cors = require('cors');
const panelRoutes = require('./routes/panelRoutes');

const app = express();

// Ensure CORS is configured to accept requests from the frontend
app.use(cors());
app.use(express.json());

// Mount the new panel routes
app.use('/api/panels', panelRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
