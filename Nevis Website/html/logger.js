/* ══════════════════════════════════════════════════════════
   config/logger.js
   Winston structured logger — console + rotating file output
   Levels: error | warn | info | http | debug
══════════════════════════════════════════════════════════ */

const winston = require("winston");
const path    = require("path");
require("winston-daily-rotate-file");

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LOG_DIR   = process.env.LOG_DIR   || "logs";

/* ── Pretty format for dev console ── */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, requestId, stack }) => {
    const rid = requestId ? ` [${requestId}]` : "";
    return `${timestamp}${rid} ${level}: ${stack || message}`;
  })
);

/* ── JSON format for log files ── */
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

/* ── Rotating transports ── */
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename:     path.join(LOG_DIR, "error-%DATE%.log"),
  datePattern:  "YYYY-MM-DD",
  level:        "error",
  maxSize:      "10m",
  maxFiles:     "14d",
  zippedArchive: true,
  format:       fileFormat,
});

const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename:     path.join(LOG_DIR, "combined-%DATE%.log"),
  datePattern:  "YYYY-MM-DD",
  maxSize:      "20m",
  maxFiles:     "7d",
  zippedArchive: true,
  format:       fileFormat,
});

/* ── Logger instance ── */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production" ? fileFormat : devFormat,
    }),
    errorFileTransport,
    combinedFileTransport,
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename:    path.join(LOG_DIR, "exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles:    "14d",
      format:      fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename:    path.join(LOG_DIR, "rejections-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles:    "14d",
      format:      fileFormat,
    }),
  ],
  exitOnError: false,
});

/* ── Morgan-compatible stream ── */
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
