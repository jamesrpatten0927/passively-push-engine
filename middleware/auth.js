require("dotenv").config();

const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  try {

    const authHeader =
      req.headers.authorization ||
      req.headers.Authorization;

    console.log(
      "[AUTH HEADER]",
      authHeader
    );

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log(
      "[JWT VERIFIED]",
      decoded
    );

    req.user = decoded;

    next();

  } catch (err) {

    console.error(
      "[AUTH ERROR]",
      err.message
    );

    return res.status(403).json({
      error: "Forbidden"
    });

  }
};

module.exports = {
  authenticateUser
};
