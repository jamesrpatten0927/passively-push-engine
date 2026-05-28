require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3001;

/*
MIDDLEWARE
*/

app.use(cors());

app.use(express.json());

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
TEST API
*/

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API WORKING"
  });
});

/*
START SERVER
*/

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
