/* ══════════════════════════════════════════════════════════
   middleware/validate.js
   Runs express-validator result and throws ApiError(400)
   with all field errors if any failed.
   Usage:
     router.post('/register', [...validationRules], validate, handler)
══════════════════════════════════════════════════════════ */

const { validationResult } = require("express-validator");
const ApiError             = require("../utils/ApiError");

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map(({ path, msg }) => ({ field: path, message: msg }));
  next(ApiError.badRequest("Validation failed", "VALIDATION_ERROR", errors));
}

module.exports = validate;
