'use strict';
const authService = require('../services/authService.cjs');

function login(req, res) {
  const result = authService.login(req.body, req.app.locals.config);
  res.status(200).json({ success: true, data: result });
}
module.exports = { login };
