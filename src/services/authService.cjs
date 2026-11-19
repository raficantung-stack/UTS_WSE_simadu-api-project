'use strict';

const users = require('../repositories/userRepository.cjs');
const { verifyPassword, signAccessToken } = require('../utils/security.cjs');
const { AppError } = require('../utils/errors.cjs');

function login({ username, password }, { jwtSecret, tokenExpirySeconds }) {
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    throw new AppError(400, 'Username dan password wajib diisi', 'VALIDATION_ERROR');
  }
  const user = users.findByUsername(username.trim());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AppError(401, 'Kredensial tidak valid', 'INVALID_CREDENTIALS');
  }
  const token = signAccessToken(user, jwtSecret, tokenExpirySeconds);
  return { token, tokenType: 'Bearer', expiresIn: tokenExpirySeconds, user: users.publicUser(user) };
}

module.exports = { login };
