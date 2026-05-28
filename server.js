require(“dotenv”).config();

const express = require(“express”);
const cors = require(“cors”);

const { Pool } = require(“pg”);

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

app.get(”/”, function(req, res) {

res.send(“Server Running”);

});

app.get(”/health”, function(req, res) {

res.json({
status: “ok”
});

});

app.get(”/api/subscribers/:user_id”, async function(req, res) {

try {

const user_id = req.params.user_id;
const result = await pool.query(
  "SELECT id, endpoint, user_id, created_at FROM subscribers WHERE user_id = $1 ORDER BY created_at DESC",
  [user_id]
);
res.json({
  success: true,
  total: result.rows.length,
  subscribers: result.rows
});

} catch (err) {

console.error(err);
res.status(500).json({
  success: false,
  error: err.message
});

}

});

app.listen(PORT, function() {

console.log(“Server running on port “ + PORT);

});
