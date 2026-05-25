const express = require("express");

const router = express.Router();

router.get("/test", (req, res) => {return res.json({success: true,message: "Panels route working"});});

module.exports = router;
