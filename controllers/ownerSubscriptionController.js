const db = require('../config/db');

const saveOwnerSubscription = async (req, res) => {
  const { user_id, subscription } = req.body;

  if (!user_id || !subscription) {
    return res.status(400).json({ error: 'user_id and subscription are required' });
  }

  try {
    // Upsert the owner's push subscription
    const query = `
      INSERT INTO owner_subscriptions (user_id, subscription)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE 
      SET subscription = EXCLUDED.subscription, 
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const result = await db.query(query, [user_id, subscription]);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error saving owner subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { saveOwnerSubscription };
