const db = require('../config/db');
const crypto = require('crypto');

exports.createJourney = async (req, res) => {
  try {
    const { userId, name, triggerType, triggerIntent, steps, status } = req.body;
    
    if (!userId || !name) {
      return res.status(400).json({ error: 'userId and name are required' });
    }

    const id = `journey_${crypto.randomBytes(8).toString('hex')}`;
    const stepsJson = JSON.stringify(steps || []);
    const currentStatus = status || 'draft';

    const query = `
      INSERT INTO journeys (id, user_id, name, trigger_type, trigger_intent, steps, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
    `;
    const values = [id, userId, name, triggerType, triggerIntent, stepsJson, currentStatus];
    const result = await db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating journey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateJourney = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { name, triggerType, triggerIntent, steps, status } = req.body;
    
    const stepsJson = steps ? JSON.stringify(steps) : null;

    const query = `
      UPDATE journeys
      SET 
        name = COALESCE($1, name),
        trigger_type = COALESCE($2, trigger_type),
        trigger_intent = COALESCE($3, trigger_intent),
        steps = COALESCE($4, steps),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `;
    const values = [name, triggerType, triggerIntent, stepsJson, status, journeyId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating journey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteJourney = async (req, res) => {
  try {
    const { journeyId } = req.params;
    
    const query = 'DELETE FROM journeys WHERE id = $1 RETURNING id;';
    const result = await db.query(query, [journeyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    res.status(200).json({ message: 'Journey deleted successfully' });
  } catch (error) {
    console.error('Error deleting journey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserJourneys = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = 'SELECT * FROM journeys WHERE user_id = $1 ORDER BY created_at DESC;';
    const result = await db.query(query, [userId]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching user journeys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
