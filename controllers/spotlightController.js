const db = require('../config/db'); // Adjust path to your database module
const crypto = require('crypto');

exports.createSpotlight = async (req, res) => {
  try {
    const {
  userId,
  title,
  titleIcon,
  body,
  badgeText,
  badgeIcon,
  buttonText,
  buttonUrl,
  themeColor,
  buttonColor,
  category,
  status,
  startDateTime,
  endDateTime,

  spotlightStyle,
  glowColor,
  glowIntensity,
  glowSpread,
  darkness,
  animationPreset,
  backgroundFocusEffect
} = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const id = `spotlight_${crypto.randomBytes(8).toString('hex')}`;
    const currentStatus = status || 'draft';
    
    const start = (startDateTime === "" || startDateTime === undefined) ? null : startDateTime;
    const end = (endDateTime === "" || endDateTime === undefined) ? null : endDateTime;

    const query = `
      INSERT INTO spotlights (
  id,
  user_id,
  title,
  title_icon,
  body,
  badge_text,
  badge_icon,
  button_text,
  button_url,
  theme_color,
  buttonColor,
  category,
  status,
  start_date_time,
  end_date_time,

  spotlight_style,
  glow_color,
  glow_intensity,
  glow_spread,
  darkness,
  animation_preset,
  background_focus_effect,

  created_at,
  updated_at
)
VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
  $15,$16,$17,$18,$19,$20,$21,
  NOW(),NOW()
)
RETURNING *;
    `;
    const values = [
  id,
  userId,
  title,
  titleIcon || '',
  body,
  badgeText || '',
  badgeIcon || '',
  buttonText || '',
  buttonUrl || '',
  themeColor || '',
  category || '',
  currentStatus,
  start,
  end,

  spotlightStyle || 'standard',
  glowColor || null,
  glowIntensity || 70,
  glowSpread || 100,
  darkness || 15,
  animationPreset || null,
  backgroundFocusEffect || false
];

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
    const {
  title,
  titleIcon,
  body,
  badgeText,
  badgeIcon,
  buttonText,
  buttonUrl,
  themeColor,
  buttonColor,
  category,
  status,
  startDateTime,
  endDateTime,

  spotlightStyle,
  glowColor,
  glowIntensity,
  glowSpread,
  darkness,
  animationPreset,
  backgroundFocusEffect
} = req.body;
    const start = (startDateTime === "" || startDateTime === undefined) ? null : startDateTime;
    const end = (endDateTime === "" || endDateTime === undefined) ? null : endDateTime;

    const query = `
      UPDATE spotlights
      SET title = COALESCE($1, title),
          title_icon = COALESCE($2, title_icon),
          body = COALESCE($3, body),
          badge_text = COALESCE($4, badge_text),
          badge_icon = COALESCE($5, badge_icon),
          button_text = COALESCE($6, button_text),
          button_url = COALESCE($7, button_url),
          theme_color = COALESCE($8, theme_color),
          category = COALESCE($9, category),
          status = COALESCE($10, status),
          start_date_time = $11,
          end_date_time = $12,
          spotlight_style = COALESCE($13, spotlight_style),
glow_color = COALESCE($14, glow_color),
glow_intensity = COALESCE($15, glow_intensity),
glow_spread = COALESCE($16, glow_spread),
darkness = COALESCE($17, darkness),
animation_preset = COALESCE($18, animation_preset),
background_focus_effect = COALESCE($19, background_focus_effect),
          updated_at = NOW()
      WHERE id = $20
      RETURNING *;
    `;
    const values = [
  title,
  titleIcon,
  body,
  badgeText,
  badgeIcon,
  buttonText,
  buttonUrl,
  themeColor,
  category,
  status,
  start,
  end,

  spotlightStyle,
  glowColor,
  glowIntensity,
  glowSpread,
  darkness,
  animationPreset,
  backgroundFocusEffect,

  spotlightId
];

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

exports.updateSpotlightStatus = async (req, res) => {
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
