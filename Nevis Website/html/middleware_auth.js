const jwt = require("jsonwebtoken");

/* ── Require valid JWT ── */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    res.status(401).json({ message: msg });
  }
}

/* ── Require admin role ── */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Admin access required" });
  next();
}

module.exports = { requireAuth, requireAdmin };
