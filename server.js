const express = require(“express”);
const cors = require(“cors”);

const app = express();

const PORT = process.env.PORT || 3001;

app.use(cors());

app.use(express.json());

/*

ROOT

*/

app.get(”/”, function(req, res) {

res.send(“OK”);

});

/*

HEALTH

*/

app.get(”/health”, function(req, res) {

res.json({
status: “ok”,
message: “Passively Push Engine running”
});

});

/*

TEST API ROUTE

*/

app.get(”/api/test”, function(req, res) {

res.json({
success: true,
message: “API working”
});

});

/*

START SERVER

*/

app.listen(PORT, function() {

console.log(“RUNNING ON PORT “ + PORT);

});
