require("dotenv").config();

const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Pool } = require("pg");

const pushRoutes = require("./routes/pushRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------------------------
   DATABASE CONNECTION
---------------------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/* ---------------------------
   MIDDLEWARE
---------------------------- */

app.use(cors());
app.use(express.json());

/* ---------------------------
   WEB PUSH CONFIG
---------------------------- */

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/* ---------------------------
   PUSH ROUTES
---------------------------- */

app.use("/api", pushRoutes);

/* ---------------------------
   HEALTH CHECK
---------------------------- */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Passively Push Engine running",
  });
});

/* ---------------------------
   USER SIGNUP
---------------------------- */

app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "User already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique user ID
    const userId = crypto.randomBytes(8).toString("hex");

    // Save user
    await pool.query(
      `
      INSERT INTO users (user_id, email, password_hash)
      VALUES ($1, $2, $3)
      `,
      [userId, email, passwordHash]
    );

    console.log(`[SIGNUP] New user created: ${email}`);

    res.status(201).json({
      success: true,
      userId,
    });
  } catch (err) {
    console.error("[SIGNUP ERROR]", err);

    res.status(500).json({
      error: "Signup failed",
    });
  }
});

/* ---------------------------
   USER LOGIN
---------------------------- */

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    // Compare password
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    console.log(`[LOGIN] ${email} logged in`);

    res.json({
      success: true,
      userId: user.user_id,
      email: user.email,
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);

    res.status(500).json({
      error: "Login failed",
    });
  }
});

/* ---------------------------
   TEMP MIGRATION ROUTE
---------------------------- */

app.get("/api/run-user-migration", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("[MIGRATION] Users table created successfully");

    res.json({
      success: true,
      message: "Users table created successfully",
    });
  } catch (err) {
    console.error("[ERROR] Running migration:", err);

    res.status(500).json({
      error: "Database migration failed",
    });
  }
});

/* ---------------------------
   START SERVER
---------------------------- */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
