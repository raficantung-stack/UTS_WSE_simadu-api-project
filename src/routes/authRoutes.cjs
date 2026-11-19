'use strict';
const express = require('express');
const controller = require('../controllers/authController.cjs');
const { validateBody } = require('../middleware/validateBody.cjs');
const router = express.Router();
router.post('/login', validateBody(['username', 'password'], ['username', 'password']), controller.login);
module.exports = router;
