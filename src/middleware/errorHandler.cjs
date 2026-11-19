'use strict';
const { AppError } = require('../utils/errors.cjs');

function notFound(req, res, next) {
  next(new AppError(404, 'Endpoint tidak ditemukan', 'ROUTE_NOT_FOUND'));
}
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Format JSON tidak valid' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran body melebihi batas' } });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  const safeMessage = status >= 500 ? 'Terjadi kesalahan internal pada server' : error.message;
  if (status >= 500) console.error('[SIMADU] Internal error:', error.message);
  return res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: safeMessage } });
}
module.exports = { notFound, errorHandler };
