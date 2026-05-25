const express = require(“express”);
const router = express.Router();

/*

TEMP IN-MEMORY PANEL STORE
(we will replace with database later)

*/

const panels = {};

/*

CREATE PANEL
POST /api/panels/create

*/

router.post(”/create”, async (req, res) => {
try {
const panelId = panel_${Date.now()};

const panelData = {
  id: panelId,
  createdAt: new Date().toISOString(),
  ...req.body,
};
panels[panelId] = panelData;
console.log("=================================");
console.log("[PANEL CREATED]");
console.log(panelData);
return res.status(200).json({
  success: true,
  panel: panelData,
});

} catch (err) {
console.log(”=================================”);
console.log(”[CREATE PANEL ERROR]”);
console.log(err);

return res.status(500).json({
  success: false,
  error: err.message,
});

}
});

/*

GET PANEL
GET /api/panels/:panelId

*/

router.get(”/:panelId”, async (req, res) => {
try {
const { panelId } = req.params;

console.log("=================================");
console.log("[GET PANEL]");
console.log(panelId);
const panel = panels[panelId];
if (!panel) {
  return res.status(404).json({
    success: false,
    error: "Panel not found",
  });
}
return res.status(200).json(panel);

} catch (err) {
console.log(”=================================”);
console.log(”[GET PANEL ERROR]”);
console.log(err);

return res.status(500).json({
  success: false,
  error: err.message,
});

}
});

/*

UPDATE PANEL
PUT /api/panels/:panelId

*/

router.put(”/:panelId”, async (req, res) => {
try {
const { panelId } = req.params;

if (!panels[panelId]) {
  return res.status(404).json({
    success: false,
    error: "Panel not found",
  });
}
panels[panelId] = {
  ...panels[panelId],
  ...req.body,
  updatedAt: new Date().toISOString(),
};
console.log("=================================");
console.log("[PANEL UPDATED]");
console.log(panels[panelId]);
return res.status(200).json({
  success: true,
  panel: panels[panelId],
});

} catch (err) {
console.log(”=================================”);
console.log(”[UPDATE PANEL ERROR]”);
console.log(err);

return res.status(500).json({
  success: false,
  error: err.message,
});

}
});

/*

DELETE PANEL
DELETE /api/panels/:panelId

*/

router.delete(”/:panelId”, async (req, res) => {
try {
const { panelId } = req.params;

if (!panels[panelId]) {
  return res.status(404).json({
    success: false,
    error: "Panel not found",
  });
}
delete panels[panelId];
console.log("=================================");
console.log("[PANEL DELETED]");
console.log(panelId);
return res.status(200).json({
  success: true,
  deleted: panelId,
});

} catch (err) {
console.log(”=================================”);
console.log(”[DELETE PANEL ERROR]”);
console.log(err);

return res.status(500).json({
  success: false,
  error: err.message,
});

}
});

module.exports = router;
