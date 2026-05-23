require("dotenv").config();

const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const { Pool } = require("pg");
const pushRoutes = require("./routes/pushRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(express.json());

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.use("/api", pushRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Passively Push Engine running"
  });
});

// Temporary Database Migration Route
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
