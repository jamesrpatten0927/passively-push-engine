require(“dotenv”).config();

const express = require(“express”);
const cors = require(“cors”);

const app = express();

const PORT = process.env.PORT || 3001;

app.use(cors());

app.use(express.json());

/*

HEALTH

*/

app.get(”/”, (req, res) => {
res.send(“Passively Push Engine Running”);
});

app.get(”/health”, (req, res) => {

res.json({
status: “ok”
});

});

/*

TEST PUSH ROUTE

*/

app.post(”/api/test”, (req, res) => {

console.log(“TEST ROUTE HIT”);

res.json({
success: true
});

});

/*

START SERVER

*/
app.get("/api/subscribers/:user_id", async (req, res) => {
  try {

    const { user_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        endpoint,
        user_id,
        created_at
      FROM subscribers
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [user_id]
    );

    res.json({
      success: true,
      total: result.rows.length,
      subscribers: result.rows
    });

  } catch (err) {

    console.error("[GET SUBSCRIBERS ERROR]", err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
});
app.listen(PORT, () => {

console.log(Server running on ${PORT});

});
