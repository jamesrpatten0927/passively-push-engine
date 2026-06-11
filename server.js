const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const jwt = require("jsonwebtoken");

const pool = require("./config/db");
const panelRoutes = require("./routes/panelRoutes");
const spotlightRoutes = require("./routes/spotlightRoutes");
const leadRoutes = require("./routes/leadRoutes");
const ownerSubscriptionRoutes = require("./routes/ownerSubscriptionRoutes");
const authRoutes = require("./routes/authRoutes");
const scanRoutes = require('./routes/scanRoutes');

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
API ROUTES
*/

app.use("/api/panels", panelRoutes);
app.use("/api/spotlights", spotlightRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/owner-subscriptions", ownerSubscriptionRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/scans', scanRoutes);

/*
WEB PUSH CONFIG
*/

webpush.setVapidDetails(
  "mailto:support@passively.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/*
DATABASE TABLES
*/

async function createTables() {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database tables ready");

  } catch (err) {

    console.error("TABLE ERROR:", err);

  }

}

/*
JWT AUTH
*/

function authenticateToken(req, res, next) {

  const authHeader = req.headers["authorization"];

  const token =
    authHeader &&
    authHeader.split(" ")[1];

  if (!token) {

    return res.status(401).json({
      error: "Missing token"
    });

  }

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    (err, user) => {

      if (err) {

        return res.status(403).json({
          error: "Invalid token"
        });

      }

      req.user = user;

      next();

    }
  );

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
    status: "ok"
  });

});

/*
SUBSCRIBE
*/

app.post("/api/subscribe", async (req, res) => {

  try {

    const {
      subscription,
      user_id
    } = req.body;

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys
    ) {

      return res.status(400).json({
        error: "Invalid subscription"
      });

    }

    await pool.query(`
      INSERT INTO subscribers (
        endpoint,
        p256dh,
        auth,
        user_id
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint)
      DO NOTHING;
    `, [
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      user_id || null
    ]);

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Subscription failed"
    });

  }

});

/*
GET USER SUBSCRIBERS
*/

app.get(
  "/api/subscribers/:user_id",
  authenticateToken,
  async (req, res) => {

    try {

      const user_id =
        req.params.user_id;

      const result = await pool.query(`
        SELECT *
        FROM subscribers
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [user_id]);

      res.json({
        success: true,
        total: result.rows.length,
        subscribers: result.rows
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: "Failed loading subscribers"
      });

    }

  }
);

/*
SEND PUSH
*/

app.post("/api/send-notification", authenticateToken, async (req, res) => {

  const {
    title,
    body,
    user_id
  } = req.body;

  if (!title || !body || !user_id) {

    return res.status(400).json({
      error: "Missing required fields"
    });

  }

  try {

    const result = await pool.query(`
      SELECT *
      FROM subscribers
      WHERE user_id = $1
    `, [user_id]);

    if (result.rows.length === 0) {

      return res.status(404).json({
        error: "No subscribers found for this user"
      });

    }

    const payload = JSON.stringify({
      title,
      body
    });

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

        console.error("WEBPUSH ERROR:", err);

      }

    }

    res.json({
      success: true,
      sent: successCount
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Push failed"
    });

  }

});

/*
START SERVER
*/

async function startServer() {

  try {

    await createTables();

    app.listen(PORT, () => {

      console.log(
        "Server running on port " + PORT
      );

    });

  } catch (err) {

    console.error(err);

  }

}

startServer();
