'use strict';

const crypto = require('node:crypto');
const { AppError } = require('./errors.cjs');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false;
  const [scheme, saltHex, hashHex] = encoded.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signAccessToken(user, secret, expiresInSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    role: user.role,
    name: user.name,
    iat: now,
    exp: now + expiresInSeconds,
    jti: crypto.randomUUID(),
    iss: 'simadu-api',
    aud: 'simadu-client'
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyAccessToken(token, secret) {
  if (typeof token !== 'string') throw new AppError(401, 'Token tidak valid atau telah kedaluwarsa', 'UNAUTHORIZED');
  const parts = token.split('.');
  if (parts.length !== 3) throw new AppError(401, 'Token tidak valid atau telah kedaluwarsa', 'UNAUTHORIZED');
  const [encodedHeader, encodedPayload, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto.createHmac('sha256', secret).update(unsigned).digest();
  let provided;
  try { provided = Buffer.from(signature, 'base64url'); } catch { provided = Buffer.alloc(0); }
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new AppError(401, 'Token tidak valid atau telah kedaluwarsa', 'UNAUTHORIZED');
  }
  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || !payload.sub || !payload.role || !payload.exp || payload.exp <= now || payload.iss !== 'simadu-api' || payload.aud !== 'simadu-client') {
      throw new Error('claims invalid');
    }
    return payload;
  } catch {
    throw new AppError(401, 'Token tidak valid atau telah kedaluwarsa', 'UNAUTHORIZED');
  }
}

function parseExpiry(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(value || '15m');
  if (!match) throw new Error('JWT_EXPIRES_IN harus berformat s, m, h, atau d, contoh 15m');
  const amount = Number(match[1]);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  const seconds = amount * unit;
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 86400) throw new Error('Masa berlaku token harus 1 detik sampai 24 jam');
  return seconds;
}

module.exports = { hashPassword, verifyPassword, signAccessToken, verifyAccessToken, parseExpiry };
