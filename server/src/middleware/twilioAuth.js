'use strict';

const twilio = require('twilio');
const logger = require('../utils/logger');

/**
 * Validates the X-Twilio-Signature header to ensure requests are genuinely from Twilio.
 * In development/test mode, validation is skipped to allow local testing.
 */
function twilioAuth(req, res, next) {
  // Skip validation in test/development environments when no signature is present
  if (process.env.NODE_ENV !== 'production' && !req.headers['x-twilio-signature']) {
    logger.warn({ message: 'Twilio signature validation skipped (non-production without signature)' });
    return next();
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];

  // Build the full URL Twilio would have used
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['host'];
  const url = `${protocol}://${host}${req.originalUrl}`;

  const isValid = twilio.validateRequest(authToken, signature, url, req.body);

  if (!isValid) {
    logger.warn({ message: 'Invalid Twilio signature', url, signature: signature?.slice(0, 20) });
    return res.status(403).json({ error: 'Forbidden — invalid Twilio signature' });
  }

  next();
}

module.exports = twilioAuth;
