require("dotenv").config();

const express = require("express");
const cors = require("cors");
const webpush = require("web-push");

const app = express();

const PORT = process.env.PORT || 3001;

/*
MIDDLEWARE
*/

app.use(cors());

app.use(express.json());

/*
WEB PUSH CONFIG
*/

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:test@test.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/*
TEMP MEMORY STORAGE
*/

let subscriptions = [];

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
SUBSCRIBE
*/

app.post("/api/subscribe", (req, res) => {

  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {

    return res.status(400).json({
      success: false,
      error: "Invalid subscription"
    });

  }

  subscriptions.push(subscription);

  console.log("NEW SUBSCRIBER");

  res.json({
    success: true
  });

});

/*
SEND TEST PUSH
*/

app.post("/api/send-test", async (req, res) => {

  try {

    const payload = JSON.stringify({
      title: "Passively Test",
      body: "Push notifications are working"
    });

    let successCount = 0;

    for (const sub of subscriptions) {

      try {

        await webpush.sendNotification(sub, payload);

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

/*
START SERVER
*/

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
