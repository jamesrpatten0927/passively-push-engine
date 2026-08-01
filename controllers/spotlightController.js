const db = require('../config/db'); // Adjust path to your database module
const crypto = require('crypto');

function formatSpotlightResponse(row) {
  if (!row) return row;
  return {
    ...row,
    sequenceId: row.sequence_id !== undefined ? row.sequence_id : row.sequenceId,
    sequenceName: row.sequence_name !== undefined ? row.sequence_name : row.sequenceName,
    stepNumber: row.step_number !== undefined ? row.step_number : row.stepNumber,
  };
}

exports.createSpotlight = async (req, res) => {
  try {
    const {
      userId, title, titleIcon, title_icon, body, badgeText, badge_text, badgeIcon, badge_icon,
      buttonText, buttonUrl, themeColor, category, status, startDateTime, endDateTime,
      animation, delay, frequency, backgroundFocusEffect,
      sequenceId, sequence_id, sequenceName, sequence_name, stepNumber, step_number
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const finalTitleIcon = titleIcon !== undefined ? titleIcon : (title_icon !== undefined ? title_icon : '');
    const finalBadgeIcon = badgeIcon !== undefined ? badgeIcon : (badge_icon !== undefined ? badge_icon : '');
    const finalBadgeText = badgeText !== undefined ? badgeText : (badge_text !== undefined ? badge_text : '');
    const finalSequenceId = sequenceId !== undefined ? sequenceId : (sequence_id !== undefined ? sequence_id : null);
    const finalSequenceName = sequenceName !== undefined ? sequenceName : (sequence_name !== undefined ? sequence_name : null);
    const finalStepNumber = stepNumber !== undefined ? stepNumber : (step_number !== undefined ? step_number : null);

    const id = `spotlight_${crypto.randomBytes(8).toString('hex')}`;
    const currentStatus = status || 'draft';
    
    const start = (startDateTime === "" || startDateTime === undefined) ? null : startDateTime;
    const end = (endDateTime === "" || endDateTime === undefined) ? null : endDateTime;

    const query = `
      INSERT INTO spotlights (
        id, user_id, title, title_icon, body, badge_text, badge_icon, button_text, button_url,
        theme_color, category, status, start_date_time, end_date_time, animation, delay,
        frequency, background_focus_effect, sequence_id, sequence_name, step_number, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      id, userId, title, finalTitleIcon, body, finalBadgeText, finalBadgeIcon, buttonText || '', buttonUrl || '',
      themeColor || '', category || '', currentStatus, start, end, animation || 'slide', delay || 0,
      frequency || 'always', backgroundFocusEffect === undefined ? false : backgroundFocusEffect,
      finalSequenceId, finalSequenceName, finalStepNumber
    ];

    const result = await db.query(query, values);

    res.status(201).json(formatSpotlightResponse(result.rows[0]));
  } catch (error) {
    console.error('Error creating spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateSpotlight = async (req, res) => {
  try {
    const { spotlightId } = req.params;
    const {
      title, titleIcon, title_icon, body, badgeText, badge_text, badgeIcon, badge_icon,
      buttonText, buttonUrl, themeColor, category, status, startDateTime, endDateTime,
      animation, delay, frequency, backgroundFocusEffect,
      sequenceId, sequence_id, sequenceName, sequence_name, stepNumber, step_number
    } = req.body;

    const finalTitleIcon = titleIcon !== undefined ? titleIcon : (title_icon !== undefined ? title_icon : null);
    const finalBadgeIcon = badgeIcon !== undefined ? badgeIcon : (badge_icon !== undefined ? badge_icon : null);
    const finalBadgeText = badgeText !== undefined ? badgeText : (badge_text !== undefined ? badge_text : null);
    const finalSequenceId = sequenceId !== undefined ? sequenceId : (sequence_id !== undefined ? sequence_id : null);
    const finalSequenceName = sequenceName !== undefined ? sequenceName : (sequence_name !== undefined ? sequence_name : null);
    const finalStepNumber = stepNumber !== undefined ? stepNumber : (step_number !== undefined ? step_number : null);

    const start = (startDateTime === "" || startDateTime === undefined) ? null : startDateTime;
    const end = (endDateTime === "" || endDateTime === undefined) ? null : endDateTime;

    const query = `
      UPDATE spotlights
      SET title = COALESCE($1, title),
          title_icon = $2,
          body = COALESCE($3, body),
          badge_text = COALESCE($4, badge_text),
          badge_icon = $5,
          button_text = COALESCE($6, button_text),
          button_url = COALESCE($7, button_url),
          theme_color = COALESCE($8, theme_color),
          category = COALESCE($9, category),
          status = COALESCE($10, status),
          start_date_time = $11,
          end_date_time = $12,
          animation = COALESCE($13, animation),
          delay = COALESCE($14, delay),
          frequency = COALESCE($15, frequency),
          background_focus_effect = COALESCE($16, background_focus_effect),
          sequence_id = COALESCE($17, sequence_id),
          sequence_name = COALESCE($18, sequence_name),
          step_number = COALESCE($19, step_number),
          updated_at = NOW()
      WHERE id = $20
      RETURNING *;
    `;
    const values = [
      title, finalTitleIcon, body, finalBadgeText, finalBadgeIcon, buttonText, buttonUrl,
      themeColor, category, status, start, end, animation, delay, frequency,
      backgroundFocusEffect !== undefined ? backgroundFocusEffect : null,
      finalSequenceId, finalSequenceName, finalStepNumber, spotlightId
    ];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json(formatSpotlightResponse(result.rows[0]));
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

    res.status(200).json(formatSpotlightResponse(result.rows[0]));
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

    res.status(200).json(result.rows.map(formatSpotlightResponse));
  } catch (error) {
    console.error('Error fetching user spotlights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateSpotlightStatus = async (req, res) => {
  try {
    const { spotlightId } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'inactive', 'scheduled'].includes(status)) {
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

    res.status(200).json(formatSpotlightResponse(result.rows[0]));
  } catch (error) {
    console.error('Error toggling spotlight status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
