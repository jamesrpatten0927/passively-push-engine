const express = require("express");

const app = express();

app.get("/", function(req, res) {
  res.send("OK");
});

app.listen(3001, function() {
  console.log("RUNNING");
});
