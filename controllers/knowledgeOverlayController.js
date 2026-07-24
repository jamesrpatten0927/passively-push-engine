const db = require('../config/db');
const crypto = require('crypto');

const getOverlays = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await db.query(
      'SELECT * FROM knowledge_overlays WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching overlays:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOverlay = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const result = await db.query(
      'SELECT * FROM knowledge_overlays WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching overlay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createOverlay = async (req, res) => {
  try {
    const { title, slug, summary, body_html, status } = req.body;
    const userId = req.user.user_id;
    const id = 'ko_' + crypto.randomUUID().replace(/-/g, '');
    
    const result = await db.query(
      `INSERT INTO knowledge_overlays (id, user_id, title, slug, summary, body_html, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, title, slug, summary, body_html, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating overlay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateOverlay = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, summary, body_html, status } = req.body;
    const userId = req.user.user_id;
    
    const result = await db.query(
      `UPDATE knowledge_overlays 
       SET title = $1, slug = $2, summary = $3, body_html = $4, status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, slug, summary, body_html, status, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating overlay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteOverlay = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    const result = await db.query(
      'DELETE FROM knowledge_overlays WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting overlay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPublicOverlays = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      'SELECT id, title, slug, summary, body_html, updated_at FROM knowledge_overlays WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
      [userId, 'published']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching public overlays:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getOverlays,
  getOverlay,
  createOverlay,
  updateOverlay,
  deleteOverlay,
  getPublicOverlays
};
