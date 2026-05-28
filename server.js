require("dotenv").config();

const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3001;

/*
DATABASE
*/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/*
MIDDLEWARE
*/

app.use(cors());

app.use(express.json());

/*
WEB PUSH CONFIG
*/

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:test@test.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/*
CREATE TABLE
*/

async function initializeDatabase() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Subscribers table ready");

}

/*
ROOT
*/

app.get("/", (req, res) => {
  res.send("PASSIVELY PUSH ENGINE RUNNING");
});

/*
HEALTH
*/

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Push Engine Healthy"
  });
});

/*
SUBSCRIBE
*/

app.post("/api/subscribe", async (req, res) => {

  try {

    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {

      return res.status(400).json({
        success: false,
        error: "Invalid subscription"
      });

    }

    await pool.query(
      `
      INSERT INTO subscribers (
        endpoint,
        p256dh,
        auth
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (endpoint)
      DO NOTHING
      `,
      [
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth
      ]
    );

    console.log("SUBSCRIBER SAVED");

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

/*
SEND TEST PUSH
*/

app.post("/api/send-test", async (req, res) => {

  try {

    const payload = JSON.stringify({
      title: "Passively Test",
      body: "Push notifications are working"
    });

    const result = await pool.query(`
      SELECT *
      FROM subscribers
    `);

    let successCount = 0;

    for (const sub of result.rows) {

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

        console.log("FAILED SUB");

      }

    }

    res.json({
      success: true,
      sent: successCount
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

/*
START SERVER
*/

initializeDatabase()
  .then(() => {

    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });

  })
  .catch((err) => {

    console.error("DB INIT FAILED");
    console.error(err);

  });
