const db = require("../config/db");
const webpush = require("web-push");

exports.subscribe = async (req, res) => {
  const { subscription, location_id } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({
      error: "Invalid subscription object"
    });
  }

  try {

    const { endpoint, keys } = subscription;

    await db.query(
      `
      INSERT INTO subscribers (
        endpoint,
        p256dh,
        auth,
        location_id
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint)
      DO NOTHING
      `,
      [
        endpoint,
        keys.p256dh,
        keys.auth,
        location_id || "default"
      ]
    );

    res.status(201).json({
      message: "Subscribed successfully"
    });

  } catch (error) {

    console.error("Subscription error:", error);

    res.status(500).json({
      error: "Database error"
    });
  }
};

exports.sendNotification = async (req, res) => {

  const {
    title,
    body,
    url,
    icon
  } = req.body;

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon
  });

  try {

    let query;
    let params = [];

    // MASTER ADMIN
    if (req.user.role === "master_admin") {

      query = `
        SELECT endpoint, p256dh, auth
        FROM subscribers
      `;

    } else {

      // LANDLORD TENANT
      query = `
        SELECT endpoint, p256dh, auth
        FROM subscribers
        WHERE location_id = $1
      `;

      params = [req.user.location_id];
    }

    const { rows } = await db.query(query, params);

    let successCount = 0;

    const sendPromises = rows.map(async (sub) => {

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {

        await webpush.sendNotification(
          pushSubscription,
          payload
        );

        successCount++;

      } catch (err) {

        console.error(
          "Push send error:",
          err.statusCode
        );

        // Remove expired subscriptions
        if (
          err.statusCode === 404 ||
          err.statusCode === 410
        ) {

          await db.query(
            `
            DELETE FROM subscribers
            WHERE endpoint = $1
            `,
            [sub.endpoint]
          );
        }
      }
    });

    await Promise.all(sendPromises);

    res.status(200).json({
      message: "Notifications sent",
      sent: successCount,
      total: rows.length
    });

  } catch (error) {

    console.error("Broadcast error:", error);

    res.status(500).json({
      error: "Failed to send notifications"
    });
  }
};

exports.getSubscribers = async (req, res) => {

  try {

    let query;
    let params = [];

    // MASTER ADMIN
    if (req.user.role === "master_admin") {

      query = `
        SELECT COUNT(*) FROM subscribers
      `;

    } else {

      // LANDLORD TENANT
      query = `
        SELECT COUNT(*) FROM subscribers
        WHERE location_id = $1
      `;

      params = [req.user.location_id];
    }

    const { rows } = await db.query(
      query,
      params
    );

    res.status(200).json({
      count: parseInt(rows[0].count, 10)
    });

  } catch (error) {

    console.error(
      "Subscriber count error:",
      error
    );

    res.status(500).json({
      error: "Database error"
    });
  }
};
