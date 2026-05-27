const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Initialize PostgreSQL connection using the existing DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create the table if it doesn't exist on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS panels (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT,
    text TEXT,
    button_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);

// POST /api/panels - Save a panel
router.post('/', async (req, res) => {
  const { id, title, text, buttonText } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Panel ID is required' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO panels (id, title, text, button_text, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        text = EXCLUDED.text,
        button_text = EXCLUDED.button_text,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `, [id, title, text, buttonText]);

    console.log(`Saved panel to DB: ${id}`);

    // Return the mapped JSON exactly as the frontend expects
    res.status(200).json({
      id: rows[0].id,
      title: rows[0].title,
      text: rows[0].text,
      buttonText: rows[0].button_text
    });
  } catch (err) {
    console.error('Database save error:', err);
    res.status(500).json({ error: 'Failed to save panel to database' });
  }
});

// GET /api/panels/:id - Fetch a panel
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query('SELECT * FROM panels WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
    }

    // Return the mapped JSON exactly as the frontend expects
    res.status(200).json({
      id: rows[0].id,
      title: rows[0].title,
      text: rows[0].text,
      buttonText: rows[0].button_text
    });
  } catch (err) {
    console.error('Database fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch panel from database' });
  }
});

module.exports = router;
// GET /api/panels - List all panels
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM panels ORDER BY updated_at DESC');
    
    // Return the mapped JSON exactly as the frontend expects
    res.status(200).json(rows.map(row => ({
      id: row.id,
      title: row.title,
      text: row.text,
      buttonText: row.button_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  } catch (err) {
    console.error('Database fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch panels from database' });
  }
});
