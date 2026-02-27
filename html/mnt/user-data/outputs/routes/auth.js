/* ══════════════════════════════════════════════════════════
   routes/auth.js
   Authentication API  —  /api/auth/*

   Endpoints:
     POST   /register          Create new account
     POST   /login             Sign in, get token pair
     POST   /refresh           Rotate refresh → new access token
     POST   /logout            Revoke token & clear cookie
     POST   /forgot-password   Send secure reset email
     POST   /reset-password    Apply new password with token
     GET    /profile           Get own profile  [auth]
     PATCH  /profile           Update username / bio / avatar  [auth]
     POST   /change-password   Change own password  [auth]
══════════════════════════════════════════════════════════ */

const router    = require("express").Router();
const crypto    = require("crypto");
const { body }  = require("express-validator");

const User          = require("../models/User");
const emailService  = require("../services/emailService");
const tokenService  = require("../services/tokenService");
const { requireAuth }                    = require("../middleware/auth");
const { authLimiter, strictLimiter, profileLimiter } = require("../middleware/rateLimiter");
const validate      = require("../middleware/validate");
const asyncHandler  = require("../utils/asyncHandler");
const ApiError      = require("../utils/ApiError");
const logger        = require("../config/logger");

/* ── Shared validation rules ── */
const emailRule    = body("email").isEmail().normalizeEmail().withMessage("Valid email required");
const passwordRule = body("password")
  .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
  .matches(/[A-Z]/).withMessage("Password needs an uppercase letter")
  .matches(/[a-z]/).withMessage("Password needs a lowercase letter")
  .matches(/\d/).withMessage("Password needs a number");

/* ── Helper: set refresh cookie ── */
function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, tokenService.refreshCookieOptions());
}

/* ══════════════════════════════════════════════════════════
   POST /api/auth/register
══════════════════════════════════════════════════════════ */
router.post(
  "/register",
  authLimiter,
  [
    body("username").trim().isLength({ min: 2, max: 30 }).escape()
      .withMessage("Username must be 2–30 characters"),
    emailRule,
    passwordRule,
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    /* Check for existing account */
    const exists = await User.findOne({ email }).lean();
    if (exists) throw ApiError.conflict("Email is already registered", "EMAIL_TAKEN");

    /* Create user */
    const user = await User.create({ username, email, password });

    logger.info("User registered", { userId: user._id, email, requestId: req.id });

    /* Send welcome email (non-blocking) */
    emailService.sendWelcome({ to: email, username }).catch((err) =>
      logger.warn("Welcome email failed", { userId: user._id, error: err.message })
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user:    user.toPublic(),
    });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/login
══════════════════════════════════════════════════════════ */
router.post(
  "/login",
  authLimiter,
  [emailRule, body("password").notEmpty().withMessage("Password is required")],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    /* Fetch user WITH password (selected: false by default) */
    const user = await User.findOne({ email }).select("+password");

    /* Always run bcrypt to prevent timing attacks */
    const { valid, locked } = user
      ? await user.checkPassword(password)
      : { valid: false, locked: false };

    if (locked) throw ApiError.unauthorized("Account temporarily locked — try again in 30 minutes", "ACCOUNT_LOCKED");
    if (!user || !valid) throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");

    if (!user.active) throw ApiError.unauthorized("Account is disabled — contact support", "ACCOUNT_INACTIVE");

    /* Update stats */
    user.lastLogin   = new Date();
    user.lastLoginIp = req.ip;
    user.loginCount  = (user.loginCount || 0) + 1;
    await user.save();

    const { accessToken, refreshToken } = tokenService.issueTokens(user);
    setRefreshCookie(res, refreshToken);

    logger.info("User logged in", { userId: user._id, requestId: req.id });

    res.json({
      success: true,
      message: "Login successful",
      token:   accessToken,
      user:    user.toPublic(),
    });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/refresh
   Rotates the refresh token (cookie) → new access + refresh pair
══════════════════════════════════════════════════════════ */
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) throw ApiError.unauthorized("No refresh token", "NO_REFRESH_TOKEN");

    const { valid, payload } = tokenService.verifyRefreshToken(rawToken);
    if (!valid) throw ApiError.unauthorized("Invalid or expired refresh token", "REFRESH_INVALID");

    const user = await User.findById(payload.id);
    if (!user || !user.active) throw ApiError.unauthorized("User not found or inactive", "USER_INACTIVE");

    const { accessToken, refreshToken } = tokenService.issueTokens(user);
    setRefreshCookie(res, refreshToken);

    res.json({ success: true, token: accessToken });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/logout
══════════════════════════════════════════════════════════ */
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    /* Revoke access token if provided */
    const raw = req.headers.authorization?.split(" ")[1];
    if (raw) tokenService.revokeToken(raw);

    /* Clear refresh cookie */
    res.clearCookie("refreshToken", { path: "/" });

    res.json({ success: true, message: "Logged out successfully" });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/forgot-password
══════════════════════════════════════════════════════════ */
router.post(
  "/forgot-password",
  strictLimiter,
  [emailRule],
  validate,
  asyncHandler(async (req, res) => {
    /* Always respond 200 to prevent email enumeration */
    res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });

    const user = await User.findOne({ email: req.body.email });
    if (!user) return;

    /* Generate secure random token */
    const resetToken       = crypto.randomBytes(32).toString("hex");
    const expiryMs         = parseInt(process.env.RESET_TOKEN_EXPIRY_MS, 10) || 15 * 60 * 1000;
    user.resetToken        = resetToken;
    user.resetTokenExpiry  = Date.now() + expiryMs;
    await user.save();

    const siteUrl   = process.env.SITE_URL || "http://localhost:5500";
    const resetLink = `${siteUrl}/reset-password.html?token=${resetToken}`;

    emailService
      .sendPasswordReset({ to: user.email, username: user.username, resetLink })
      .catch((err) =>
        logger.warn("Password reset email failed", { userId: user._id, error: err.message })
      );

    logger.info("Password reset requested", { userId: user._id, requestId: req.id });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/reset-password
══════════════════════════════════════════════════════════ */
router.post(
  "/reset-password",
  strictLimiter,
  [
    body("token")
      .notEmpty().isHexadecimal().isLength({ min: 64, max: 64 })
      .withMessage("Invalid reset token"),
    body("newPassword").custom((v, { req }) => {
      // Reuse password rule inline
      if (v.length < 8)        throw new Error("Password must be at least 8 characters");
      if (!/[A-Z]/.test(v))    throw new Error("Password needs an uppercase letter");
      if (!/[a-z]/.test(v))    throw new Error("Password needs a lowercase letter");
      if (!/\d/.test(v))       throw new Error("Password needs a number");
      return true;
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: Date.now() },
    }).select("+password");

    if (!user) throw ApiError.badRequest("Reset link is invalid or has expired", "INVALID_RESET_TOKEN");

    user.password         = newPassword;
    user.resetToken       = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    logger.info("Password reset completed", { userId: user._id, requestId: req.id });

    res.json({ success: true, message: "Password updated successfully" });
  })
);

/* ══════════════════════════════════════════════════════════
   GET /api/auth/profile  [requireAuth]
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
   PATCH /api/auth/profile  [requireAuth]
══════════════════════════════════════════════════════════ */
router.patch(
  "/profile",
  requireAuth,
  profileLimiter,
  [
    body("username").optional().trim().isLength({ min: 2, max: 30 }).escape()
      .withMessage("Username must be 2–30 characters"),
    body("bio").optional().trim().isLength({ max: 200 })
      .withMessage("Bio cannot exceed 200 characters"),
    body("avatar").optional().trim().isURL().withMessage("Avatar must be a valid URL"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const ALLOWED = ["username", "bio", "avatar"];
    const updates = {};
    ALLOWED.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user) throw ApiError.notFound("User not found");

    logger.info("Profile updated", { userId: user._id, fields: Object.keys(updates), requestId: req.id });

    res.json({ success: true, user: user.toPublic() });
  })
);

/* ══════════════════════════════════════════════════════════
   POST /api/auth/change-password  [requireAuth]
══════════════════════════════════════════════════════════ */
router.post(
  "/change-password",
  requireAuth,
  strictLimiter,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").custom((v) => {
      if (v.length < 8)        throw new Error("Password must be at least 8 characters");
      if (!/[A-Z]/.test(v))    throw new Error("Password needs an uppercase letter");
      if (!/[a-z]/.test(v))    throw new Error("Password needs a lowercase letter");
      if (!/\d/.test(v))       throw new Error("Password needs a number");
      return true;
    }),
    body("newPassword").custom((v, { req }) => {
      if (v === req.body.currentPassword)
        throw new Error("New password must be different from current password");
      return true;
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");
    if (!user) throw ApiError.notFound("User not found");

    const { valid } = await user.checkPassword(currentPassword);
    if (!valid) throw ApiError.unauthorized("Current password is incorrect", "WRONG_PASSWORD");

    user.password = newPassword;
    await user.save();

    /* Revoke current token so user must re-login */
    if (req.token) tokenService.revokeToken(req.token);
    res.clearCookie("refreshToken", { path: "/" });

    logger.info("Password changed", { userId: user._id, requestId: req.id });

    res.json({ success: true, message: "Password changed. Please log in again." });
  })
);

module.exports = router;
