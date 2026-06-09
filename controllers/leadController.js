const db = require('../config/db');
const crypto = require('crypto');

exports.createLead = async (req, res) => {
  try {
    const { user_id, source, name, phone, email, questionnaire_answers } = req.body;

    if (!user_id || !source) {
      return res.status(400).json({ error: 'user_id and source are required' });
    }

    const lead_id = `lead_${crypto.randomBytes(8).toString('hex')}`;

    const insertQuery = `
      INSERT INTO leads (lead_id, user_id, source, name, phone, email, questionnaire_answers, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      lead_id,
      user_id,
      source,
      name || null,
      phone || null,
      email || null,
      questionnaire_answers ? JSON.stringify(questionnaire_answers) : null
    ]);

    res.status(201).json({ success: true, lead: result.rows[0], lead_id });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const query = 'SELECT * FROM leads WHERE user_id = $1 ORDER BY created_at DESC;';
    const result = await db.query(query, [user_id]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
