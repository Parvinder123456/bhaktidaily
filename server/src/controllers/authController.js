'use strict';

/**
 * Auth Controller — Password-based phone authentication
 *
 * POST /api/auth/login  { phone, password }  -> 200 { token }
 */

const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login
 * Authenticates with phone + password and returns a JWT.
 */
async function login(req, res) {
  const { phone, password } = req.body;

  if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const token = await authService.loginWithPassword(phone.trim(), password);

  logger.info({ message: 'authController: login successful', phone: phone.trim() });
  return res.status(200).json({ token });
}

module.exports = { login };
