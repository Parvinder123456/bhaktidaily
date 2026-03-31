'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Validates X-Hub-Signature-256 on Meta webhook POSTs.
 * Skipped in non-production if no signature header is present (for local dev).
 * Requires req.rawBody to be set by the JSON body parser middleware.
 */
function metaWebhookAuth(req, res, next) {
  if (process.env.NODE_ENV !== 'production' && !req.headers['x-hub-signature-256']) {
    logger.warn({ message: 'Meta signature validation skipped (non-production)' });
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;

  if (!signature || !appSecret) {
    // If no app secret configured, skip validation (warn in production)
    if (process.env.NODE_ENV === 'production') {
      logger.warn({ message: 'META_APP_SECRET not set — skipping signature validation' });
    }
    return next();
  }

  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', appSecret).update(req.rawBody || '').digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      logger.warn({ message: 'Invalid Meta webhook signature' });
      return res.status(403).json({ error: 'Forbidden — invalid signature' });
    }
  } catch {
    logger.warn({ message: 'Meta signature comparison failed' });
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

module.exports = metaWebhookAuth;
