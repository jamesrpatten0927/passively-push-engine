const db = require('../db'); // Adjust path to your database module
const crypto = require('crypto');

exports.createSpotlight = async (req, res) => {
  try {
    const { userId, title, body, badgeText, buttonText, buttonUrl, status } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const id = `spotlight_${crypto.randomBytes(8).toString('hex')}`;
    const currentStatus = status || 'draft';

    const query = `
      INSERT INTO spotlights (id, user_id, title, body, badge_text, button_text, button_url, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *;
    `;
    const values = [id, userId, title, body, badgeText || '', buttonText || '', buttonUrl || '', currentStatus];

    const result = await db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateSpotlight = async (req, res) => {
  try {
    const { spotlightId } = req.params;
    const { title, body, badgeText, buttonText, buttonUrl, status } = req.body;

    const query = `
      UPDATE spotlights
      SET title = COALESCE($1, title),
          body = COALESCE($2, body),
          badge_text = COALESCE($3, badge_text),
          button_text = COALESCE($4, button_text),
          button_url = COALESCE($5, button_url),
          status = COALESCE($6, status),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *;
    `;
    const values = [title, body, badgeText, buttonText, buttonUrl, status, spotlightId];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteSpotlight = async (req, res) => {
  try {
    const { spotlightId } = req.params;

    const query = 'DELETE FROM spotlights WHERE id = $1 RETURNING id;';
    const result = await db.query(query, [spotlightId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json({ message: 'Spotlight deleted successfully' });
  } catch (error) {
    console.error('Error deleting spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSpotlight = async (req, res) => {
  try {
    const { spotlightId } = req.params;

    const query = 'SELECT * FROM spotlights WHERE id = $1;';
    const result = await db.query(query, [spotlightId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserSpotlights = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = 'SELECT * FROM spotlights WHERE user_id = $1';
    const values = [userId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }
    
    query += ' ORDER BY created_at DESC;';

    const result = await db.query(query, values);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching user spotlights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.toggleSpotlightStatus = async (req, res) => {
  try {
    const { spotlightId } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const query = `
      UPDATE spotlights
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [status, spotlightId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling spotlight status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
