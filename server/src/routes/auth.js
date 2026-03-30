'use strict';

/**
 * Auth Routes — Password-based authentication
 *
 * POST /api/auth/login  -> authController.login
 */

const express = require('express');
const { login } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);

module.exports = router;
