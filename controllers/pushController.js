const pool = require('../config/db');
const webpush = require('web-push');
// Configure web-push
webpush.setVapidDetails(
  'mailto:support@example.com', // Replace with your support email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
exports.subscribe = async (req, res) => {
  const { panelId, subscription } = req.body;
  if (!panelId || !subscription) {
    return res.status(400).json({ error: 'Missing panelId or subscription' });
  }
  try {
    // 1. Lookup panel owner
    const panelResult = await pool.query('SELECT user_id FROM panels WHERE id = $1', [panelId]);
    
    if (panelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
    }
    const ownerUserId = panelResult.rows[0].user_id;
    // 2. Save subscriber with owner user_id
    await pool.query(
      `INSERT INTO subscribers (endpoint, p256dh, auth, user_id) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) 
       DO UPDATE SET 
         p256dh = EXCLUDED.p256dh, 
         auth = EXCLUDED.auth, 
         user_id = EXCLUDED.user_id`,
      [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, ownerUserId]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
exports.getSubscribers = async (req, res) => {
  const ownerUserId = req.user.user_id;
  try {
    const result = await pool.query(
      'SELECT id, endpoint, created_at FROM subscribers WHERE user_id = $1 ORDER BY created_at DESC',
      [ownerUserId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
exports.sendNotification = async (req, res) => {
  const ownerUserId = req.user.user_id;
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Missing title or body' });
  }
  try {
    const result = await pool.query('SELECT * FROM subscribers WHERE user_id = $1', [ownerUserId]);
    const subscribers = result.rows;
    const payload = JSON.stringify({ title, body });
    
    let successCount = 0;
    let failureCount = 0;
    // Send pushes in parallel
    const pushPromises = subscribers.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (err) {
        // Auto cleanup for expired/unsubscribed endpoints
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query('DELETE FROM subscribers WHERE endpoint = $1', [sub.endpoint]);
        }
        failureCount++;
      }
    });
    await Promise.all(pushPromises);
    res.json({ success: true, successCount, failureCount });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
