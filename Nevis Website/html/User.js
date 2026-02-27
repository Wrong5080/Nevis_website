/* ══════════════════════════════════════════════════════════
   models/User.js
   Mongoose User schema
   Features:
   · bcrypt hashing on save (cost factor from env)
   · comparePassword instance method
   · toPublic() — strips sensitive fields for API responses
   · Indexes on email (unique) and resetToken
   · Tracks login count, last login, failed attempts, lock-out
══════════════════════════════════════════════════════════ */

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
const MAX_FAILED    = 5;   // lock account after 5 consecutive fails
const LOCK_TIME_MS  = 30 * 60 * 1000; // 30 minutes

const userSchema = new mongoose.Schema(
  {
    /* ── Identity ── */
    username: {
      type:      String,
      required:  [true, "Username is required"],
      trim:      true,
      minlength: [2,  "Username must be at least 2 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_\- ]+$/,
        "Username may only contain letters, numbers, spaces, hyphens and underscores",
      ],
    },

    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
      index:     true,
    },

    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select:    false, // never returned in queries by default
    },

    /* ── Role & Status ── */
    role:     { type: String, enum: ["user", "admin"], default: "user" },
    verified: { type: Boolean, default: false },
    active:   { type: Boolean, default: true },

    /* ── Profile ── */
    avatar:   { type: String, default: "" },
    bio:      { type: String, maxlength: 200, default: "" },

    /* ── Security ── */
    loginCount:        { type: Number, default: 0 },
    lastLogin:         { type: Date },
    lastLoginIp:       { type: String },
    failedLoginCount:  { type: Number, default: 0 },
    lockUntil:         { type: Date },

    /* ── Password reset ── */
    resetToken:        { type: String, index: true },
    resetTokenExpiry:  { type: Date },

    /* ── Email verification ── */
    verifyToken:       { type: String },
    verifyTokenExpiry: { type: Date },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

/* ── Virtual: is account currently locked? ── */
userSchema.virtual("isLocked").get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

/* ══════════════════════════════════════════════════════════
   PRE-SAVE: Hash password if modified
══════════════════════════════════════════════════════════ */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

/* ══════════════════════════════════════════════════════════
   METHODS
══════════════════════════════════════════════════════════ */

/**
 * Constant-time password comparison.
 * Also handles failed-attempt tracking and account lockout.
 * @returns {{ valid: boolean, locked: boolean }}
 */
userSchema.methods.checkPassword = async function (plain) {
  if (this.isLocked) return { valid: false, locked: true };

  const valid = await bcrypt.compare(plain, this.password);

  if (!valid) {
    this.failedLoginCount += 1;
    if (this.failedLoginCount >= MAX_FAILED) {
      this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
    await this.save();
    return { valid: false, locked: this.isLocked };
  }

  // Successful — reset counters
  if (this.failedLoginCount > 0 || this.lockUntil) {
    this.failedLoginCount = 0;
    this.lockUntil        = undefined;
  }

  return { valid: true, locked: false };
};

/**
 * Return a safe public representation of the user.
 * NEVER includes password, resetToken, verifyToken, IP, failedCounts.
 */
userSchema.methods.toPublic = function () {
  return {
    id:         this._id,
    username:   this.username,
    email:      this.email,
    role:       this.role,
    verified:   this.verified,
    avatar:     this.avatar,
    bio:        this.bio,
    createdAt:  this.createdAt,
    lastLogin:  this.lastLogin,
    loginCount: this.loginCount,
  };
};

/* ── Compound index for efficient token lookups ── */
userSchema.index({ resetToken: 1, resetTokenExpiry: 1 });

module.exports = mongoose.model("User", userSchema);
