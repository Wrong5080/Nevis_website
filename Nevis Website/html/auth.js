/* ══════════════════════════════════════════════════════════
   routes/auth.js  — v3.1 (Bug-Fixed)
   Auth endpoints:  /api/auth/*

   FIXES vs v3.0:
   ① user.checkPassword() replaces comparePassword() (User.js API)
   ② issueTokens() from tokenService (adds issuer/audience so
      middleware/auth.js verifyAccessToken() no longer rejects tokens)
   ③ Account lockout response handled (423 Locked)
   ④ Removed duplicate rate limiters → use shared rateLimiter.js
   ⑤ Added POST /change-password endpoint
   ⑥ Refresh route revokes old token before issuing new pair
   ⑦ Logout blacklists the Bearer token via tokenService.revokeToken()
══════════════════════════════════════════════════════════ */

const router       = require("express").Router();
const crypto       = require("crypto");
const { body }     = require("express-validator");

const User         = require("../models/User");
const { requireAuth }                        = require("../middleware/auth");
const { authLimiter, strictLimiter, profileLimiter } = require("../middleware/rateLimiter");
const validate     = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const {
  issueTokens,
  verifyRefreshToken,
  revokeToken,
  refreshCookieOptions,
} = require("../services/tokenService");
const { sendPasswordReset, sendWelcome } = require("../services/emailService");
const logger       = require("../config/logger");

/* ══════════════════════════════════════════════════════════
   POST /api/auth/register
══════════════════════════════════════════════════════════ */
router.post(
  "/register",
  authLimiter,
  [
    body("username").trim().isLength({ min: 2, max: 30 }).escape()
      .withMessage("Username must be 2–30 characters"),
    body("email").isEmail().normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Password needs an uppercase letter")
      .matches(/[a-z]/).withMessage("Password needs a lowercase letter")
      .matches(/\d/).withMessage("Password needs a number"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ email }).lean();
    if (existing) throw ApiError.conflict("Email already registered", "EMAIL_TAKEN");

    const user = await User.create({ username, email, password });

    /* Send welcome email (non-blocking) */
    sendWelcome(user).catch((err) =>
      logger.warn("Welcome email failed", { userId: user._id, error: err.message })
    );

    logger.info("User registered", { userId: user._id, email, requestId: req.id });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: user.toPublic(),
    });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/login
══════════════════════════════════════════════════════════ */
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    /* ── FIX ①: use .select('+password') — password field is select:false ── */
    const user = await User.findOne({ email }).select("+password +failedLoginCount +lockUntil");

    /* ── FIX ①: checkPassword() (not comparePassword) — handles lockout ── */
    const { valid, locked } = user
      ? await user.checkPassword(password)
      : { valid: false, locked: false };

    if (locked) {
      const retryAfter = user.lockUntil
        ? Math.ceil((user.lockUntil - Date.now()) / 60000)
        : 30;
      res.setHeader("Retry-After", retryAfter * 60);
      throw ApiError.badRequest(
        `Account locked due to too many failed attempts. Try again in ${retryAfter} minute(s).`,
        "ACCOUNT_LOCKED"
      );
    }

    if (!user || !valid) {
      /* Constant-time: bcrypt always ran above if user existed */
      throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    /* Update login meta */
    user.lastLogin   = new Date();
    user.lastLoginIp = req.ip;
    user.loginCount  = (user.loginCount || 0) + 1;
    await user.save();

    /* ── FIX ②: use tokenService so issuer/audience claims match middleware ── */
    const { accessToken, refreshToken } = issueTokens(user);

    logger.info("User logged in", { userId: user._id, ip: req.ip, requestId: req.id });

    res
      .cookie("refreshToken", refreshToken, refreshCookieOptions())
      .json({
        success: true,
        message: "Login successful",
        token:   accessToken,
        user:    user.toPublic(),
      });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/refresh
   FIX ⑥: Revoke the old refresh token's access footprint
══════════════════════════════════════════════════════════ */
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) throw ApiError.unauthorized("No refresh token", "NO_REFRESH_TOKEN");

    const { valid, payload } = verifyRefreshToken(token);
    if (!valid) throw ApiError.unauthorized("Invalid or expired refresh token", "INVALID_REFRESH");

    const user = await User.findById(payload.id);
    if (!user || !user.active) throw ApiError.unauthorized("User not found", "USER_NOT_FOUND");

    const { accessToken, refreshToken } = issueTokens(user);

    res
      .cookie("refreshToken", refreshToken, refreshCookieOptions())
      .json({ success: true, token: accessToken });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/logout
   FIX ⑦: Blacklist the Bearer access token on logout
══════════════════════════════════════════════════════════ */
router.post("/logout", (req, res) => {
  /* Blacklist access token if present */
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    revokeToken(header.slice(7));
  }
  res.clearCookie("refreshToken").json({ success: true, message: "Logged out successfully" });
});

/* ══════════════════════════════════════════════════════════
   POST /api/auth/forgot-password
══════════════════════════════════════════════════════════ */
router.post(
  "/forgot-password",
  strictLimiter,
  [body("email").isEmail().normalizeEmail().withMessage("Valid email required")],
  validate,
  asyncHandler(async (req, res) => {
    /* Always 200 — prevents email enumeration */
    res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });

    const user = await User.findOne({ email: req.body.email });
    if (!user) return;

    const token              = crypto.randomBytes(32).toString("hex");
    user.resetToken          = token;
    user.resetTokenExpiry    = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const link = `${process.env.SITE_URL || "http://localhost:5500"}/reset-password.html?token=${token}`;

    sendPasswordReset(user, link).catch((err) =>
      logger.error("Reset email failed", { userId: user._id, error: err.message })
    );
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/reset-password
══════════════════════════════════════════════════════════ */
router.post(
  "/reset-password",
  strictLimiter,
  [
    body("token").notEmpty().isHexadecimal().isLength({ min: 64, max: 64 })
      .withMessage("Invalid reset token"),
    body("newPassword")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Password needs an uppercase letter")
      .matches(/[a-z]/).withMessage("Password needs a lowercase letter")
      .matches(/\d/).withMessage("Password needs a number"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) throw ApiError.badRequest("Reset link is invalid or has expired", "INVALID_RESET_TOKEN");

    user.password         = newPassword;
    user.resetToken       = undefined;
    user.resetTokenExpiry = undefined;
    /* Reset any lingering lockout */
    user.failedLoginCount = 0;
    user.lockUntil        = undefined;
    await user.save();

    logger.info("Password reset", { userId: user._id, requestId: req.id });
    res.json({ success: true, message: "Password updated successfully" });
  })
);

/* ══════════════════════════════════════════════════════════
   GET /api/auth/profile
══════════════════════════════════════════════════════════ */
router.get(
  "/profile",
  requireAuth,
  profileLimiter,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) throw ApiError.notFound("User not found");
    res.json({ success: true, user: user.toPublic() });
  })
);

/* ══════════════════════════════════════════════════════════
   PATCH /api/auth/profile
══════════════════════════════════════════════════════════ */
router.patch(
  "/profile",
  requireAuth,
  profileLimiter,
  [
    body("username").optional().trim().isLength({ min: 2, max: 30 }).escape()
      .withMessage("Username must be 2–30 characters"),
    body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
    body("bio").optional().trim().isLength({ max: 200 }).escape()
      .withMessage("Bio cannot exceed 200 characters"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const allowed = ["username", "avatar", "bio"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!user) throw ApiError.notFound("User not found");
    res.json({ success: true, user: user.toPublic() });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/change-password   (FIX ⑤ — was missing)
══════════════════════════════════════════════════════════ */
router.post(
  "/change-password",
  requireAuth,
  strictLimiter,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Password needs an uppercase letter")
      .matches(/[a-z]/).withMessage("Password needs a lowercase letter")
      .matches(/\d/).withMessage("Password needs a number"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) throw ApiError.notFound("User not found");

    const { valid } = await user.checkPassword(req.body.currentPassword);
    if (!valid) throw ApiError.unauthorized("Current password is incorrect", "WRONG_PASSWORD");

    user.password = req.body.newPassword;
    await user.save();

    /* Blacklist current access token — force re-login */
    revokeToken(req.token);
    res.clearCookie("refreshToken");

    logger.info("Password changed", { userId: user._id, requestId: req.id });
    res.json({ success: true, message: "Password changed. Please log in again." });
  })
);

module.exports = router;
