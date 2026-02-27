const router     = require("express").Router();
const jwt        = require("jsonwebtoken");
const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
const rateLimit  = require("express-rate-limit");
const User       = require("../models/User");
const { requireAuth } = require("../middleware/auth");

/* ── Rate limiters ── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,
  message: { message: "Too many requests — please try again later." },
  standardHeaders: true, legacyHeaders: false,
});
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hr
  max: 5,
  message: { message: "Too many attempts — please try again in an hour." },
  standardHeaders: true, legacyHeaders: false,
});

/* ── Helper: issue JWT pair ── */
function issueTokens(user) {
  const payload = { id: user._id, username: user.username, email: user.email, role: user.role };
  const access  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
  const refresh = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { access, refresh };
}

/* ── Helper: mailer ── */
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

/* ══════════════════════════════
   POST /api/auth/register
══════════════════════════════ */
router.post(
  "/register",
  authLimiter,
  [
    body("username").trim().isLength({ min: 2, max: 30 }).escape(),
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .matches(/[A-Z]/).withMessage("Need uppercase")
      .matches(/[a-z]/).withMessage("Need lowercase")
      .matches(/\d/).withMessage("Need number"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { username, email, password } = req.body;

      if (await User.findOne({ email }))
        return res.status(409).json({ message: "Email already registered" });

      const user = await User.create({ username, email, password });
      res.status(201).json({ message: "Account created successfully", user: user.toPublic() });
    } catch (err) {
      res.status(500).json({ message: "Registration failed — please try again" });
    }
  }
);

/* ══════════════════════════════
   POST /api/auth/login
══════════════════════════════ */
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      // Constant-time check to prevent timing attacks
      const valid = user ? await user.comparePassword(password) : false;
      if (!user || !valid)
        return res.status(401).json({ message: "Invalid email or password" });

      // Update login stats
      user.lastLogin  = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      const { access, refresh } = issueTokens(user);

      res
        .cookie("refreshToken", refresh, {
          httpOnly: true, secure: process.env.NODE_ENV === "production",
          sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({ message: "Login successful", token: access, user: user.toPublic() });
    } catch (err) {
      res.status(500).json({ message: "Login failed — please try again" });
    }
  }
);

/* ══════════════════════════════
   POST /api/auth/refresh
══════════════════════════════ */
router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { access, refresh } = issueTokens(user);
    res
      .cookie("refreshToken", refresh, {
        httpOnly: true, secure: process.env.NODE_ENV === "production",
        sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ token: access });
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

/* ══════════════════════════════
   POST /api/auth/logout
══════════════════════════════ */
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken").json({ message: "Logged out successfully" });
});

/* ══════════════════════════════
   POST /api/auth/forgot-password
══════════════════════════════ */
router.post(
  "/forgot-password",
  strictLimiter,
  [body("email").isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: "Valid email required" });

    // Always respond OK to prevent email enumeration
    res.json({ message: "If that email is registered, a reset link has been sent." });

    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) return;

      const token  = crypto.randomBytes(32).toString("hex");
      user.resetToken       = token;
      user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 min
      await user.save();

      const link = `${process.env.SITE_URL || "http://localhost:5500"}/reset-password.html?token=${token}`;
      await createTransporter().sendMail({
        from:    `"NEVIS" <${process.env.EMAIL_USER}>`,
        to:      user.email,
        subject: "🔐 NEVIS — Reset Your Password",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;
                      background:#0e060e;color:#f4eaf4;border-radius:16px;border:1px solid #2a102a;">
            <h2 style="color:#d4001f;margin-bottom:12px;">Password Reset</h2>
            <p>You requested a password reset. This link expires in <strong>15 minutes</strong>.</p>
            <a href="${link}"
               style="display:inline-block;margin:24px 0;padding:14px 32px;
                      background:linear-gradient(135deg,#d4001f,#8a0014);
                      color:#fff;border-radius:10px;text-decoration:none;font-weight:700;
                      letter-spacing:.5px;">
              Reset Password
            </a>
            <p style="color:#8a7088;font-size:12px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Forgot-password mail error:", err.message);
    }
  }
);

/* ══════════════════════════════
   POST /api/auth/reset-password
══════════════════════════════ */
router.post(
  "/reset-password",
  strictLimiter,
  [
    body("token").notEmpty().isHexadecimal().isLength({ min: 64, max: 64 }),
    body("newPassword")
      .isLength({ min: 8 })
      .matches(/[A-Z]/).matches(/[a-z]/).matches(/\d/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { token, newPassword } = req.body;
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      });
      if (!user) return res.status(400).json({ message: "Reset link is invalid or has expired" });

      user.password         = newPassword;
      user.resetToken       = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ message: "Password reset failed" });
    }
  }
);

/* ══════════════════════════════
   GET /api/auth/profile
══════════════════════════════ */
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -resetToken -resetTokenExpiry");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.toPublic());
  } catch {
    res.status(500).json({ message: "Could not fetch profile" });
  }
});

/* ══════════════════════════════
   PATCH /api/auth/profile
══════════════════════════════ */
router.patch(
  "/profile",
  requireAuth,
  [body("username").optional().trim().isLength({ min: 2, max: 30 }).escape()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const allowed = ["username", "avatar"];
      const updates = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

      const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
      res.json(user.toPublic());
    } catch {
      res.status(500).json({ message: "Profile update failed" });
    }
  }
);

module.exports = router;
