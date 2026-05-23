require("dotenv").config();

const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const pushRoutes = require("./routes/pushRoutes");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.use("/api", pushRoutes);

/*
========================================
HEALTH CHECK
========================================
*/

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Passively Push Engine running"
  });
});

/*
========================================
USER SIGNUP
========================================
*/

app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required"
      });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user_id = `user_${uuidv4().replace(/-/g, "").substring(0, 12)}`;

    const newUser = await pool.query(
      `
      INSERT INTO users (user_id, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, email, created_at
      `,
      [user_id, email, password_hash]
    );

    const token = jwt.sign(
      {
        user_id: newUser.rows[0].user_id,
        email: newUser.rows[0].email
      },
      process.env.JWT_SECRET || "supersecretjwt",
      { expiresIn: "30d" }
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
========================================
USER LOGIN
========================================
*/

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const user = userResult.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
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
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (err) {
    console.error("[LOGIN ERROR]", err);

    res.status(500).json({
      error: "Login failed"
    });
  }
});

/*
========================================
TEMPORARY USER TABLE MIGRATION
========================================
*/

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
      message: "Users table created successfully"
    });

  } catch (err) {

    console.error("[ERROR] Running migration:", err);

    res.status(500).json({
      error: "Database migration failed"
    });
  }
});

/*
========================================
START SERVER
========================================
*/

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
