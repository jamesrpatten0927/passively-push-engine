const express = require(“express”);

const router = express.Router();

/*

GET PANEL BY ID

*/

router.get(”/:panelId”, async (req, res) => {
try {
const { panelId } = req.params;

console.log("[PANELS] Fetch request for:", panelId);
return res.status(200).json({
  success: true,
  id: panelId,
  title: "Test Panel",
  description: "Passively Panels backend connected successfully",
  created_at: new Date().toISOString()
});

} catch (err) {
console.error(”[PANELS ERROR]”, err);

return res.status(500).json({
  success: false,
  error: "Failed to fetch panel"
});

}
});

/*

CREATE PANEL

*/

router.post(”/create”, async (req, res) => {
try {
const panelId =
“panel_” +
Math.random().toString(36).substring(2, 10);

console.log("[PANELS] Created panel:", panelId);
return res.status(201).json({
  success: true,
  panel: {
    id: panelId,
    title: "New Panel",
    created_at: new Date().toISOString()
  }
});

} catch (err) {
console.error(”[PANELS CREATE ERROR]”, err);

return res.status(500).json({
  success: false,
  error: "Failed to create panel"
});

}
});

module.exports = router;
