/* ══════════════════════════════════════════════════════════
   middleware/requestId.js
   Attaches a unique UUID (v4) to every request as req.id and
   the X-Request-Id response header.
   Enables request tracing across logs.
══════════════════════════════════════════════════════════ */

const { v4: uuidv4 } = require("uuid");

function requestId(req, res, next) {
  // Honour an upstream trace ID if present (e.g. from load balancer)
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
}

module.exports = requestId;
