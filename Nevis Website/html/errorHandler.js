/* ══════════════════════════════════════════════════════════
   middleware/errorHandler.js
   Central Express error handler (4-argument middleware).
   Normalises every thrown error into a consistent JSON shape:
     { success: false, status: number, code: string, message: string, errors?: [] }
   In development the full stack trace is included.
══════════════════════════════════════════════════════════ */

const mongoose = require("mongoose");
const logger   = require("../config/logger");
const ApiError = require("../utils/ApiError");

const IS_DEV = process.env.NODE_ENV !== "production";

/* ── Mongoose error → ApiError conversion ── */
function handleMongooseError(err) {
  /* Duplicate key (e.g. email already registered) */
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue?.[field];
    return ApiError.conflict(
      `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' is already taken`,
      "DUPLICATE_KEY"
    );
  }

  /* Validation error */
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return ApiError.badRequest("Validation failed", "VALIDATION_ERROR", errors);
  }

  /* Cast error (e.g. invalid ObjectId) */
  if (err.name === "CastError") {
    return ApiError.badRequest(`Invalid value for '${err.path}'`, "CAST_ERROR");
  }

  return null;
}

/* ══════════════════════════════════════════════════════════
   Main handler
══════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  /* Convert Mongoose errors */
  const converted = handleMongooseError(err);
  if (converted) return errorHandler(converted, req, res, next);

  /* Determine status & body */
  const statusCode = err.statusCode || (err.status >= 100 && err.status < 600 ? err.status : 500);
  const code       = err.code    || "INTERNAL_ERROR";
  const message    = err.isOperational
    ? err.message
    : IS_DEV
      ? err.message
      : "An unexpected error occurred";

  /* Log */
  if (statusCode >= 500) {
    logger.error("Server error", {
      requestId: req.id,
      method:    req.method,
      url:       req.originalUrl,
      status:    statusCode,
      error:     err.message,
      stack:     err.stack,
    });
  } else {
    logger.warn("Client error", {
      requestId: req.id,
      method:    req.method,
      url:       req.originalUrl,
      status:    statusCode,
      code,
      message,
    });
  }

  const body = {
    success: false,
    status:  statusCode,
    code,
    message,
    ...(err.errors?.length ? { errors: err.errors } : {}),
    ...(IS_DEV && statusCode >= 500 ? { stack: err.stack } : {}),
  };

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
