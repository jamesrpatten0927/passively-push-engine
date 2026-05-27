const express = require('express');
const router = express.Router();
const pool = require('../db'); // Assuming you have your pg pool exported from a db.js file

// POST /api/panels - Save or update a panel
router.post('/', async (req, res) => {
  const { id, title, text, buttonText, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Panel ID is required' });
  }

  // Default to draft if no status is provided
  const panelStatus = status || 'draft';

  try {
    const query = `
      INSERT INTO panels (id, title, text, button_text, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE 
      SET title = EXCLUDED.title,
          text = EXCLUDED.text,
          button_text = EXCLUDED.button_text,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const values = [id, title, text, buttonText, panelStatus];
    const result = await pool.query(query, values);
    
    // Map snake_case from DB to camelCase for frontend
    const savedPanel = result.rows[0];
    res.status(200).json({
      id: savedPanel.id,
      title: savedPanel.title,
      text: savedPanel.text,
      buttonText: savedPanel.button_text,
      status: savedPanel.status,
      updatedAt: savedPanel.updated_at
    });
  } catch (err) {
    console.error('Error saving panel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/panels - List all panels (for dashboard)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM panels ORDER BY updated_at DESC');
    
    const panels = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      text: row.text,
      buttonText: row.button_text,
      status: row.status || 'live', // Existing panels without status default to live
      updatedAt: row.updated_at
    }));
    
    res.status(200).json(panels);
  } catch (err) {
    console.error('Error fetching panels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/panels/:id - Fetch a single panel (for widget and editor)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM panels WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
    }
    
    const row = result.rows[0];
    res.status(200).json({
      id: row.id,
      title: row.title,
      text: row.text,
      buttonText: row.button_text,
      status: row.status || 'live', // Existing panels without status default to live
      updatedAt: row.updated_at
    });
  } catch (err) {
    console.error('Error fetching panel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/panels/:id - Delete a panel
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM panels WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
    }
    
    res.status(200).json({ message: 'Panel deleted successfully' });
  } catch (err) {
    console.error('Error deleting panel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
