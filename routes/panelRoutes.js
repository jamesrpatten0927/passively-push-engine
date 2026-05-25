const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {try {const { panelId } = req.params;

return res.status(200).json({
  success: true,
  id: panelId,
  title: "Test Panel"
});

} catch (err) {return res.status(500).json({success: false,error: "Failed to fetch panel"});}});

router.post("/create", async (req, res) => {try {const panelId ="panel_" +Math.random().toString(36).substring(2, 10);

return res.status(201).json({
  success: true,
  panel: {
    id: panelId
  }
});

} catch (err) {return res.status(500).json({success: false,error: "Failed to create panel"});}});

module.exports = router;
