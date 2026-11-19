'use strict';
const crypto = require('node:crypto');
const { parseExpiry } = require('./utils/security.cjs');

function loadConfig(env = process.env) {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('ganti-dengan-secret')) {
    throw new Error('JWT_SECRET wajib diatur dengan secret acak minimal 32 karakter. Salin .env.example menjadi .env lalu ubah nilainya.');
  }
  return {
    port: Number(env.PORT || 3000),
    jwtSecret: secret,
    tokenExpirySeconds: parseExpiry(env.JWT_EXPIRES_IN || '15m'),
    requestId: () => crypto.randomUUID()
  };
}
module.exports = { loadConfig };
