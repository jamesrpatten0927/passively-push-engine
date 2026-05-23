const db = require("../config/db");
const webpush = require("web-push");

/*
========================================
SUBSCRIBE USER
========================================
*/

exports.subscribe = async (req, res) => {

  const {
    subscription,
    user_id
  } = req.body;

  if (
    !subscription ||
    !subscription.endpoint
  ) {

    return res.status(400).json({
      error: "Invalid subscription object"
    });
  }

  if (!user_id) {

    return res.status(400).json({
      error: "user_id required"
    });
  }

  try {

    const {
      endpoint,
      keys
    } = subscription;

    await db.query(
      `
      INSERT INTO subscribers (
        endpoint,
        p256dh,
        auth,
        user_id
      )
      VALUES ($1, $2, $3, $4)

      ON CONFLICT (endpoint)

      DO UPDATE SET
        user_id = EXCLUDED.user_id
      `,
      [
        endpoint,
        keys.p256dh,
        keys.auth,
        user_id
      ]
    );

    res.status(201).json({
      success: true,
      message: "Subscribed successfully"
    });

  } catch (error) {

    console.error(
      "[SUBSCRIBE ERROR]",
      error
    );

    res.status(500).json({
      error: "Database error"
    });
  }
};

/*
========================================
SEND NOTIFICATION
========================================
*/

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

    /*
    ========================================
    ONLY SEND TO LOGGED-IN USER SUBSCRIBERS
    ========================================
    */

    const { rows } = await db.query(
      `
      SELECT
        endpoint,
        p256dh,
        auth

      FROM subscribers

      WHERE user_id = $1
      `,
      [req.user.user_id]
    );

    let successCount = 0;

    const sendPromises = rows.map(
      async (sub) => {

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
            "[PUSH ERROR]",
            err.statusCode
          );

          /*
          ========================================
          REMOVE DEAD SUBSCRIPTIONS
          ========================================
          */

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
      }
    );

    await Promise.all(sendPromises);

    res.status(200).json({
      success: true,
      message: "Notifications sent",
      sent: successCount,
      total: rows.length
    });

  } catch (error) {

    console.error(
      "[SEND ERROR]",
      error
    );

    res.status(500).json({
      error: "Failed to send notifications"
    });
  }
};

/*
========================================
GET USER SUBSCRIBERS
========================================
*/

exports.getSubscribers = async (req, res) => {

  try {

    const { rows } = await db.query(
      `
      SELECT COUNT(*)

      FROM subscribers

      WHERE user_id = $1
      `,
      [req.user.user_id]
    );

    res.status(200).json({
      success: true,
      count: parseInt(
        rows[0].count,
        10
      )
    });

  } catch (error) {

    console.error(
      "[SUBSCRIBER COUNT ERROR]",
      error
    );

    res.status(500).json({
      error: "Database error"
    });
  }
};
