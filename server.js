require("dotenv").config();

const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const pool = require("./config/db");

const app = express();

const PORT = process.env.PORT || 3001;

/*
MIDDLEWARE
*/

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use(express.static("public"));

/*
WEB PUSH CONFIG
*/

webpush.setVapidDetails(
  "mailto:support@passively.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/*
DATABASE TABLE
*/

async function createSubscribersTable() {

  try {

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

  } catch (err) {

    console.error("Failed creating subscribers table:", err);

  }

}

/*
ROOT
*/

app.get("/", (req, res) => {

  res.send("Passively Push Engine Running");

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

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys
    ) {

      return res.status(400).json({
        error: "Invalid subscription object"
      });

    }

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;

    await pool.query(`
      INSERT INTO subscribers (
        endpoint,
        p256dh,
        auth
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (endpoint)
      DO NOTHING;
    `, [
      endpoint,
      p256dh,
      auth
    ]);

    console.log("Subscriber stored");

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed storing subscription"
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
      success: false,
      error: err.message
    });

  }

});

/*
GET SUBSCRIBERS
*/

app.get("/api/subscribers", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT *
      FROM subscribers
      ORDER BY created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed loading subscribers"
    });

  }

});

/*
DELETE SUBSCRIBER
*/

app.delete("/api/subscribers/:id", async (req, res) => {

  try {

    const id = req.params.id;

    await pool.query(`
      DELETE FROM subscribers
      WHERE id = $1
    `, [id]);

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed deleting subscriber"
    });

  }

});

/*
START SERVER
*/

async function startServer() {

  try {

    await createSubscribersTable();

    app.listen(PORT, () => {

      console.log(`Server running on port ${PORT}`);

    });

  } catch (err) {

    console.error("Server startup failed:", err);

  }

}

startServer();
