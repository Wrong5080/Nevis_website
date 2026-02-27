/* ══════════════════════════════════════════════════════════
   NeViS — server.js  v3.0  (Enterprise Edition)
   ─────────────────────────────────────────────────────────
   Stack:
     Express · MongoDB (Mongoose) · JWT (access + refresh)
     Helmet · CORS whitelist · HPP · Mongo-sanitize
     express-rate-limit · express-validator
     Winston (structured logging + daily rotation)
     Morgan (HTTP logs → Winston) · Compression
     Cookie-parser · UUID request tracing
     Nodemailer (pooled SMTP) · bcryptjs (cost 12)
   ─────────────────────────────────────────────────────────
   Architecture:
     config/     — logger, database
     middleware/ — auth, errorHandler, rateLimiter,
                   requestId, validate
     models/     — User (full-featured schema)
     routes/     — auth (9 endpoints)
     services/   — emailService, tokenService
     utils/      — ApiError, asyncHandler
══════════════════════════════════════════════════════════ */

/* ── Load .env first ── */
require("dotenv").config();

/* ── Validate critical env vars at startup ── */
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];
const missing      = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const express           = require("express");
const cors              = require("cors");
const helmet            = require("helmet");
const morgan            = require("morgan");
const compression       = require("compression");
const cookieParser      = require("cookie-parser");
const mongoSanitize     = require("express-mongo-sanitize");
const hpp               = require("hpp");
const path              = require("path");

const logger            = require("./config/logger");
const { connectDB, disconnectDB } = require("./config/database");
const { globalLimiter } = require("./middleware/rateLimiter");
const requestId         = require("./middleware/requestId");
const errorHandler      = require("./middleware/errorHandler");

const authRoutes        = require("./routes/auth");
const contactRoutes     = require("./routes/contact");

const app = express();

/* ══════════════════════════════════════════════════════════
   TRUST PROXY
   Required for correct IP detection behind Nginx / cloud LBs
══════════════════════════════════════════════════════════ */
app.set("trust proxy", 1);

/* ══════════════════════════════════════════════════════════
   REQUEST ID  (attach before anything else)
══════════════════════════════════════════════════════════ */
app.use(requestId);

/* ══════════════════════════════════════════════════════════
   SECURITY HEADERS  (Helmet)
══════════════════════════════════════════════════════════ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc:     ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc:      ["'self'", "data:", "https:"],
        connectSrc:  ["'self'"],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
);

/* ══════════════════════════════════════════════════════════
   CORS
══════════════════════════════════════════════════════════ */
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      logger.warn("CORS blocked", { origin });
      cb(new Error(`CORS policy does not allow origin: ${origin}`));
    },
    credentials: true,
    methods:     ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  })
);

/* ══════════════════════════════════════════════════════════
   BODY PARSING & SANITIZATION
══════════════════════════════════════════════════════════ */
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

/* Strip MongoDB operators ($, .) from request body/params/query */
app.use(mongoSanitize({ replaceWith: "_", onSanitize: ({ req, key }) =>
  logger.warn("Mongo injection attempt blocked", { key, ip: req.ip, requestId: req.id })
}));

/* Prevent HTTP Parameter Pollution */
app.use(hpp());

/* ══════════════════════════════════════════════════════════
   HTTP LOGGING  (Morgan → Winston)
══════════════════════════════════════════════════════════ */
app.use(
  morgan(
    process.env.NODE_ENV === "production" ? "combined" : "dev",
    { stream: logger.stream }
  )
);

/* ══════════════════════════════════════════════════════════
   GLOBAL RATE LIMIT
══════════════════════════════════════════════════════════ */
app.use(globalLimiter);

/* ══════════════════════════════════════════════════════════
   STATIC FILES
══════════════════════════════════════════════════════════ */
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
}));

/* ══════════════════════════════════════════════════════════
   API ROUTES
══════════════════════════════════════════════════════════ */
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);

/* ── Health check ── */
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  res.json({
    success:    true,
    status:     "ok",
    timestamp:  new Date().toISOString(),
    env:        process.env.NODE_ENV || "development",
    db:         mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime:     `${Math.round(process.uptime())}s`,
    requestId:  req.id,
  });
});

/* ── SPA fallback: serve home.html for any unknown GET ── */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

/* ══════════════════════════════════════════════════════════
   CENTRAL ERROR HANDLER  (must be last)
══════════════════════════════════════════════════════════ */
app.use(errorHandler);

/* ══════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════ */
const PORT = parseInt(process.env.PORT, 10) || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    logger.info(`🚀 NeViS server v3.0 running on http://localhost:${PORT}`);
    logger.info(`   ENV: ${process.env.NODE_ENV || "development"}`);
  });

  /* ── Graceful shutdown ── */
  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      logger.info("Server closed. Goodbye!");
      process.exit(0);
    });

    // Force exit after 10s if graceful close stalls
    setTimeout(() => {
      logger.error("Forced exit after 10s timeout");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
});
