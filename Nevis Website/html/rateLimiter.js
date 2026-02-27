/* ══════════════════════════════════════════════════════════
   middleware/rateLimiter.js
   All rate-limit configs in one place.
   Uses express-rate-limit v7.
   ─────────────────────────────────────────────────────────
   Limiters:
   · globalLimiter    — 200 req / 10 min  (applied to all routes)
   · authLimiter      — 15  req / 15 min  (login, register)
   · strictLimiter    — 5   req / 60 min  (forgot-password, reset)
   · profileLimiter   — 30  req / 1 min   (profile read/update)
══════════════════════════════════════════════════════════ */

const rateLimit = require("express-rate-limit");

/* ── Shared options ── */
const sharedOptions = {
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => process.env.NODE_ENV === "test", // disable in tests
};

/* ── Custom key: prefer authenticated user ID over IP ── */
const keyByUserOrIp = (req) =>
  req.user?.id || req.ip;

/* ── Format response ── */
function handler(req, res) {
  res.status(429).json({
    success: false,
    status:  429,
    code:    "RATE_LIMITED",
    message: "Too many requests — please slow down and try again later.",
    retryAfter: res.getHeader("Retry-After"),
  });
}

/* ── Global limiter ── */
const globalLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 10 * 60 * 1000, // 10 min
  max:      200,
  handler,
});

/* ── Auth routes limiter (login, register) ── */
const authLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000, // 15 min
  max:      15,
  keyGenerator: (req) => req.body?.email || req.ip, // per email, falls back to IP
  handler,
});

/* ── Strict limiter (forgot-password, reset-password) ── */
const strictLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      5,
  keyGenerator: (req) => req.body?.email || req.ip,
  handler,
});

/* ── Profile limiter ── */
const profileLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1000, // 1 min
  max:      30,
  keyGenerator: keyByUserOrIp,
  handler,
});

module.exports = { globalLimiter, authLimiter, strictLimiter, profileLimiter };
