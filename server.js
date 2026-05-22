require("dotenv").config();
const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const pushRoutes = require("./routes/pushRoutes");

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

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Passively Push Engine running"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});