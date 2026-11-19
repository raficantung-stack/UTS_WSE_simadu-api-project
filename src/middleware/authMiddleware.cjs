'use strict';

const { verifyAccessToken } = require('../utils/security.cjs');
const userRepository = require('../repositories/userRepository.cjs');
const { AppError } = require('../utils/errors.cjs');

function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match) throw new AppError(401, 'Bearer Token wajib disertakan', 'UNAUTHORIZED');
    const claims = verifyAccessToken(match[1], req.app.locals.config.jwtSecret);
    const user = userRepository.findById(claims.sub);
    if (!user || user.role !== claims.role) throw new AppError(401, 'Token tidak valid atau telah kedaluwarsa', 'UNAUTHORIZED');
    req.user = userRepository.publicUser(user);
    next();
  } catch (error) { next(error); }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'Anda tidak memiliki hak untuk operasi ini', 'FORBIDDEN'));
    next();
  };
}

module.exports = { authenticate, authorize };
