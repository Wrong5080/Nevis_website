const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: true,
      trim: true, minlength: 2, maxlength: 30,
      match: [/^[a-zA-Z0-9_\- ]+$/, "Username may only contain letters, numbers, spaces, - and _"],
    },
    email: {
      type: String, required: true,
      unique: true, lowercase: true, trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    password: { type: String, required: true, minlength: 8 },
    role:     { type: String, enum: ["user", "admin"], default: "user" },
    verified: { type: Boolean, default: false },
    avatar:   { type: String, default: "" },
    lastLogin:{ type: Date },
    loginCount:{ type: Number, default: 0 },
    resetToken:       { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

/* ── Hash password before save ── */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ── Compare plain vs hashed ── */
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* ── Strip sensitive fields when serialising ── */
userSchema.methods.toPublic = function () {
  const { _id, username, email, role, verified, avatar, createdAt, lastLogin } = this;
  return { id: _id, username, email, role, verified, avatar, createdAt, lastLogin };
};

module.exports = mongoose.model("User", userSchema);
