/* ══════════════════════════════════════════════════════════
   utils/ApiError.js
   Custom error class — ensures every thrown error carries
   an HTTP status code, machine-readable code, and clean message.
   Catch in middleware/errorHandler.js
══════════════════════════════════════════════════════════ */

class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status (400, 401, 403, 404, 409, 422, 429, 500 …)
   * @param {string} message     Human-readable message sent to the client
   * @param {string} [code]      Optional machine-readable error code (e.g. "EMAIL_TAKEN")
   * @param {Array}  [errors]    Optional array of field-level validation errors
   */
  constructor(statusCode, message, code = null, errors = []) {
    super(message);
    this.name       = "ApiError";
    this.statusCode = statusCode;
    this.code       = code;
    this.errors     = errors;
    this.isOperational = true; // mark as known / handled error
    Error.captureStackTrace(this, this.constructor);
  }

  /* ── Factory helpers ── */
  static badRequest(msg, code, errors)  { return new ApiError(400, msg, code, errors); }
  static unauthorized(msg = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, msg, code);
  }
  static forbidden(msg = "Forbidden", code = "FORBIDDEN") {
    return new ApiError(403, msg, code);
  }
  static notFound(msg = "Resource not found", code = "NOT_FOUND") {
    return new ApiError(404, msg, code);
  }
  static conflict(msg, code = "CONFLICT")  { return new ApiError(409, msg, code); }
  static tooMany(msg = "Too many requests") { return new ApiError(429, msg, "RATE_LIMITED"); }
  static internal(msg = "Internal server error") {
    return new ApiError(500, msg, "INTERNAL_ERROR");
  }
}

module.exports = ApiError;
