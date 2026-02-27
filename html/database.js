/* ══════════════════════════════════════════════════════════
   config/database.js
   MongoDB connection manager
   · Retry logic with exponential back-off
   · Connection event listeners (connected / error / disconnected)
   · Graceful disconnect on process exit
══════════════════════════════════════════════════════════ */

const mongoose = require("mongoose");
const logger   = require("./logger");

/* ── Mongoose global settings ── */
mongoose.set("strictQuery", true);

/* ── Connection events ── */
mongoose.connection.on("connected",    () => logger.info("🍃 MongoDB connected"));
mongoose.connection.on("disconnected", () => logger.warn("⚡ MongoDB disconnected"));
mongoose.connection.on("error",        (err) => logger.error("MongoDB error", { error: err.message }));
mongoose.connection.on("reconnected",  () => logger.info("🔄 MongoDB reconnected"));

/**
 * Connect to MongoDB with retry back-off.
 * @param {number} retries  Max attempts (default 5)
 * @param {number} delay    Initial delay ms (doubles each attempt)
 */
async function connectDB(retries = 5, delay = 3000) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error("MONGO_URI is not defined in environment variables");
    process.exit(1);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS:          45000,
      });
      return; // success
    } catch (err) {
      logger.warn(`MongoDB attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error("Could not connect to MongoDB — shutting down");
        process.exit(1);
      }
      // Exponential back-off: 3s → 6s → 12s …
      const wait = delay * Math.pow(2, attempt - 1);
      logger.info(`Retrying in ${wait / 1000}s…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/**
 * Gracefully disconnect from MongoDB.
 */
async function disconnectDB() {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected — bye!");
}

module.exports = { connectDB, disconnectDB };
