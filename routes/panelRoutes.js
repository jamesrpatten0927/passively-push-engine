const express = require(“express”);

const router = express.Router();

/*

ROOT TEST

*/

router.get(”/”, (req, res) => {
return res.json({
success: true,
message: “Panels API working”
});
});

/*

GET PANEL

*/

router.get(”/:panelId”, (req, res) => {

const panelId = req.params.panelId;

return res.json({
success: true,
panel: {
id: panelId,
title: “Dynamic Panel Route Working”
}
});
});

module.exports = router;
