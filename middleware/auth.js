const jwt = require(“jsonwebtoken”);

const authenticateUser = (req, res, next) => {
try {

/*
========================================
GET AUTH HEADER
========================================
*/
const authHeader =
  req.headers.authorization ||
  req.headers.Authorization;
console.log(
  "[AUTH] Incoming Authorization Header:",
  authHeader
);
/*
========================================
VALIDATE HEADER FORMAT
========================================
*/
if (
  !authHeader ||
  !authHeader.startsWith("Bearer ")
) {
  console.log(
    "[AUTH] Missing or malformed Bearer token"
  );
  return res.status(403).json({
    error: "Forbidden"
  });
}
/*
========================================
EXTRACT TOKEN
========================================
*/
const token = authHeader.split(" ")[1];
console.log(
  "[AUTH] Extracted Token:",
  token
);
if (!token) {
  console.log(
    "[AUTH] Token extraction failed"
  );
  return res.status(403).json({
    error: "Forbidden"
  });
}
/*
========================================
VERIFY JWT
========================================
*/
const decoded = jwt.verify(
  token,
  process.env.JWT_SECRET || "supersecretjwt"
);
console.log(
  "[AUTH] JWT Verified Successfully:",
  decoded
);
/*
========================================
ATTACH USER
========================================
*/
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
