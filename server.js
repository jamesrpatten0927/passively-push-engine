require("dotenv").config();

const express = require("express");const cors = require("cors");const webpush = require("web-push");const bcrypt = require("bcryptjs");const jwt = require("jsonwebtoken");const { v4: uuidv4 } = require("uuid");

const pool = require("./config/db");

const app = express();

const PORT = process.env.PORT || 3001;

/*

MIDDLEWARE

*/

app.use(cors({origin: "*",methods: ["GET", "POST", "PUT", "DELETE"],allowedHeaders: ["Content-Type", "Authorization"]}));

app.use(express.json());

app.use(express.static("public"));

/*

WEB PUSH CONFIG

*/

webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto@test.com",process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);

/*

HEALTH CHECK

*/

app.get("/health", (req, res) => {

res.status(200).json({status: "ok",message: "Passively Push Engine running"});

});

/*

SUBSCRIBE

*/

app.post("/api/subscribe", async (req, res) => {

try {

const { subscription, user_id } = req.body;

if (!subscription || !user_id) {

  return res.status(400).json({
    error: "Missing subscription or user_id"
  });

}

await pool.query(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

await pool.query(
  `
  INSERT INTO subscribers (
    endpoint,
    p256dh,
    auth,
    user_id
  )
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (endpoint)
  DO NOTHING
  `,
  [
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    user_id
  ]
);

res.status(201).json({
  success: true
});

} catch (err) {

console.error("[SUBSCRIBE ERROR]", err);

res.status(500).json({
  error: "Failed to save subscription"
});

}

});

/*

SEND NOTIFICATION

*/

app.post("/api/send-notification", async (req, res) => {

try {

const { title, body, url } = req.body;

if (!title || !body) {

  return res.status(400).json({
    error: "Title and body required"
  });

}

const subscribers = await pool.query(`
  SELECT *
  FROM subscribers
`);

const payload = JSON.stringify({
  title,
  body,
  url: url || "/",
  icon: "/icon.png",
  badge: "/badge.png"
});

let successCount = 0;

for (const sub of subscribers.rows) {

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

    console.error("[PUSH ERROR]", err);

  }

}

res.json({
  success: true,
  sent: successCount
});

} catch (err) {

console.error("[SEND ERROR]", err);

res.status(500).json({
  error: "Failed to send notification"
});

}

});

/*

SIGNUP

*/

app.post("/api/signup", async (req, res) => {

try {

const { email, password } = req.body;

if (!email || !password) {

  return res.status(400).json({
    error: "Email and password required"
  });

}

await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

const existingUser = await pool.query(
  `
  SELECT *
  FROM users
  WHERE email = $1
  `,
  [email]
);

if (existingUser.rows.length > 0) {

  return res.status(400).json({
    error: "User already exists"
  });

}

const password_hash = await bcrypt.hash(password, 10);

const user_id =
  "user_" +
  uuidv4().replace(/-/g, "").substring(0, 12);

const newUser = await pool.query(
  `
  INSERT INTO users (
    user_id,
    email,
    password_hash
  )
  VALUES ($1, $2, $3)
  RETURNING *
  `,
  [
    user_id,
    email,
    password_hash
  ]
);

const token = jwt.sign(
  {
    user_id: newUser.rows[0].user_id,
    email: newUser.rows[0].email
  },
  process.env.JWT_SECRET || "supersecretjwt",
  {
    expiresIn: "30d"
  }
);

res.status(201).json({
  success: true,
  token,
  user: newUser.rows[0]
});

} catch (err) {

console.error("[SIGNUP ERROR]", err);

res.status(500).json({
  error: "Signup failed"
});

}

});

/*

LOGIN

*/

app.post("/api/login", async (req, res) => {

try {

const { email, password } = req.body;

const result = await pool.query(
  `
  SELECT *
  FROM users
  WHERE email = $1
  `,
  [email]
);

if (result.rows.length === 0) {

  return res.status(401).json({
    error: "Invalid credentials"
  });

}

const user = result.rows[0];

const validPassword = await bcrypt.compare(
  password,
  user.password_hash
);

if (!validPassword) {

  return res.status(401).json({
    error: "Invalid credentials"
  });

}

const token = jwt.sign(
  {
    user_id: user.user_id,
    email: user.email
  },
  process.env.JWT_SECRET || "supersecretjwt",
  {
    expiresIn: "30d"
  }
);

res.json({
  success: true,
  token,
  user
});

} catch (err) {

console.error("[LOGIN ERROR]", err);

res.status(500).json({
  error: "Login failed"
});

}

});

/*

START SERVER

*/

app.listen(PORT, () => {

console.log(🚀 Server running on port ${PORT});

});
