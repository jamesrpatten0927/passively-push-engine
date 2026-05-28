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

app.listen(PORT, () => {

console.log(Server running on ${PORT});

});
