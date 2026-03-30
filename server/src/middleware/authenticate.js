'use strict';

/**
 * TASK-021 · JWT Authentication Middleware
 *
 * Validates the Bearer JWT in the Authorization header and attaches the
 * decoded payload to req.user.
 *
 * Usage: apply to any route that requires authentication.
 *
 * req.user shape after successful auth:
 *   { userId: string, phone: string, iat: number, exp: number }
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Express middleware that enforces JWT authentication.
 *
 * Returns 401 if:
 *  - No Authorization header is present
 *  - The token is missing, expired, or tampered with
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn({
      message: 'authenticate: invalid or expired JWT',
      error: err.message,
      path: req.path,
    });

    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: message });
  }
}

module.exports = authenticate;
