controllers/pushController.js
const pool = require('../config/db'); // Adjust path to your pg pool if different
const webpush = require('web-push');

exports.subscribe = async (req, res) => {
  const { panelId, subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  try {
    // 1. Determine account ownership from the Panel ID
    const panelResult = await pool.query(
      'SELECT user_id FROM panels WHERE id = $1',
      [panelId]
    );

    if (panelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
    }

    const ownerUserId = panelResult.rows[0].user_id;

    // 2. Save subscriber directly to the account owner (Self-healing upsert)
    await pool.query(`
      INSERT INTO subscribers (endpoint, p256dh, auth, user_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (endpoint) 
      DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth
    `, [
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      ownerUserId
    ]);

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
};

exports.getSubscribers = async (req, res) => {
  // Ensure users can only fetch their own subscribers
  if (req.user.user_id !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM subscribers WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.sendNotification = async (req, res) => {
  const { title, body, user_id } = req.body;

  if (req.user.user_id !== user_id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM subscribers WHERE user_id = $1',
      [user_id]
    );

    const subscribers = result.rows;
    let successCount = 0;

    const pushPromises = subscribers.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body }));
        successCount++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Remove expired subscriptions automatically
          await pool.query('DELETE FROM subscribers WHERE endpoint = $1', [sub.endpoint]);
        }
      }
    });

    await Promise.all(pushPromises);
    res.json({ success: true, sent: successCount, total: subscribers.length });
  } catch (err) {
    console.error('Push error:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
};
