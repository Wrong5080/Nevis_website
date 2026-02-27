/* ══════════════════════════════════════════════════════════
   services/tokenService.js
   JWT token creation, verification, and revocation.

   · Access tokens  — short-lived (default 15m), Bearer header
   · Refresh tokens — long-lived  (default 7d),  httpOnly cookie
   · Token blacklist — in-memory Set (with cleanup); swap for
     Redis in production for multi-instance deployments.
══════════════════════════════════════════════════════════ */

const jwt    = require("jsonwebtoken");
const logger = require("../config/logger");

/* ── Environment ── */
const ACCESS_SECRET   = () => process.env.JWT_SECRET;
const REFRESH_SECRET  = () => process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES  || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";

/* ── In-memory blacklist { jti → expiry timestamp } ── */
const _blacklist = new Map();

/* Prune expired entries every hour */
setInterval(() => {
  const now = Date.now();
  for (const [jti, expiry] of _blacklist) {
    if (expiry < now) _blacklist.delete(jti);
  }
}, 60 * 60 * 1000).unref();

/* ══════════════════════════════════════════════════════════
   ISSUE
══════════════════════════════════════════════════════════ */

/**
 * Build the standard JWT payload from a User document.
 */
function buildPayload(user) {
  return {
    id:       user._id.toString(),
    username: user.username,
    email:    user.email,
    role:     user.role,
  };
}

/**
 * Issue a pair of signed tokens.
 * @param {Object} user  Mongoose User document
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function issueTokens(user) {
  const payload = buildPayload(user);

  const accessToken = jwt.sign(payload, ACCESS_SECRET(), {
    expiresIn: ACCESS_EXPIRES,
    issuer:    "nevis-backend",
    audience:  "nevis-client",
  });

  const refreshToken = jwt.sign(
    { id: user._id.toString() },
    REFRESH_SECRET(),
    {
      expiresIn: REFRESH_EXPIRES,
      issuer:    "nevis-backend",
      audience:  "nevis-client",
    }
  );

  return { accessToken, refreshToken };
}

/* ══════════════════════════════════════════════════════════
   VERIFY
══════════════════════════════════════════════════════════ */

/**
 * Verify an access token.
 * @returns {{ valid: boolean, expired: boolean, payload: Object|null }}
 */
function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET(), {
      issuer:   "nevis-backend",
      audience: "nevis-client",
    });

    if (_blacklist.has(payload.jti || token.slice(-20))) {
      return { valid: false, expired: false, payload: null, blacklisted: true };
    }

    return { valid: true, expired: false, payload };
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    return { valid: false, expired, payload: null };
  }
}

/**
 * Verify a refresh token.
 * @returns {{ valid: boolean, payload: Object|null }}
 */
function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET(), {
      issuer:   "nevis-backend",
      audience: "nevis-client",
    });
    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null };
  }
}

/* ══════════════════════════════════════════════════════════
   REVOKE (blacklist)
══════════════════════════════════════════════════════════ */

/**
 * Blacklist an access token until it naturally expires.
 * @param {string} token  The raw JWT string
 */
function revokeToken(token) {
  try {
    // Decode without verifying to get expiry (it may already be used)
    const decoded = jwt.decode(token);
    if (!decoded) return;
    const key    = decoded.jti || token.slice(-20);
    const expiry = (decoded.exp || 0) * 1000;
    _blacklist.set(key, expiry);
    logger.info("Token revoked", { userId: decoded.id });
  } catch (err) {
    logger.warn("revokeToken failed", { error: err.message });
  }
}

/* ── Cookie options ── */
function refreshCookieOptions() {
  const ms_per_second = 1000;
  // Parse "7d" → 604800000 ms using the ms package or manual calc
  const days = parseInt(REFRESH_EXPIRES, 10) || 7;
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   days * 24 * 60 * 60 * ms_per_second,
    path:     "/",
  };
}

module.exports = {
  issueTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  refreshCookieOptions,
};
