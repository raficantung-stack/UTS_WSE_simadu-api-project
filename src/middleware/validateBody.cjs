'use strict';
const { AppError } = require('../utils/errors.cjs');

function validateBody(allowedFields, requiredFields = []) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return next(new AppError(400, 'Body harus berupa objek JSON', 'VALIDATION_ERROR'));
    const unknown = Object.keys(body).filter((key) => !allowedFields.includes(key));
    if (unknown.length) return next(new AppError(400, `Field tidak diperbolehkan: ${unknown.join(', ')}`, 'VALIDATION_ERROR'));
    const missing = requiredFields.filter((key) => typeof body[key] !== 'string' || !body[key].trim());
    if (missing.length) return next(new AppError(400, `Field wajib diisi: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    next();
  };
}
module.exports = { validateBody };
