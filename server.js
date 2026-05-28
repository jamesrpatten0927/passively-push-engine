require("dotenv").config();

const express = require("express");const cors = require("cors");const webpush = require("web-push");const bcrypt = require("bcryptjs");const jwt = require("jsonwebtoken");const { v4: uuidv4 } = require("uuid");const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3001;

/*DATABASE*/

const pool = new Pool({connectionString: process.env.DATABASE_URL,ssl: {rejectUnauthorized: false}});

/*MIDDLEWARE*/

app.use(cors());

app.use(express.json());

/*WEB PUSH CONFIG*/

webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto@test.com",process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);

/*CREATE TABLES*/

async function initializeDatabase() {

await pool.query(    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
 );

await pool.query(    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
 );

console.log("DATABASE READY");

}

/*ROOT*/

app.get("/", (req, res) => {res.send("PASSIVELY PUSH ENGINE RUNNING");});

/*HEALTH*/

app.get("/health", (req, res) => {res.json({status: "ok",message: "Push Engine Healthy"});});

/*SIGNUP*/

app.post("/api/signup", async (req, res) => {

try {

const { email, password } = req.body;

if (!email || !password) {

  return res.status(400).json({
    success: false,
    error: "Missing email or password"
  });

}

const existing = await pool.query(
  `
  SELECT *
  FROM users
  WHERE email = $1
  `,
  [email]
);

if (existing.rows.length > 0) {

  return res.status(400).json({
    success: false,
    error: "User already exists"
  });

}

const password_hash = await bcrypt.hash(password, 10);

const user_id =
  "user_" +
  uuidv4().replace(/-/g, "").substring(0, 12);

await pool.query(
  `
  INSERT INTO users (
    user_id,
    email,
    password_hash
  )
  VALUES ($1, $2, $3)
  `,
  [
    user_id,
    email,
    password_hash
  ]
);

const token = jwt.sign(
  {
    user_id,
    email
  },
  process.env.JWT_SECRET || "supersecretjwt",
  {
    expiresIn: "30d"
  }
);

res.json({
  success: true,
  token,
  user_id
});

} catch (err) {

console.error(err);

res.status(500).json({
  success: false
});

}

});

/*LOGIN*/

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
    success: false,
    error: "Invalid credentials"
  });

}

const user = result.rows[0];

const valid = await bcrypt.compare(
  password,
  user.password_hash
);

if (!valid) {

  return res.status(401).json({
    success: false,
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
  user_id: user.user_id
});

} catch (err) {

console.error(err);

res.status(500).json({
  success: false
});

}

});

/*SUBSCRIBE*/

app.post("/api/subscribe", async (req, res) => {

try {

const subscription = req.body;

if (!subscription || !subscription.endpoint) {

  return res.status(400).json({
    success: false
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

/*SEND TEST PUSH*/

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

/*START SERVER*/

initializeDatabase().then(() => {

app.listen(PORT, () => {
  console.log("SERVER RUNNING");
});

}).catch((err) => {

console.error(err);

});
