'use strict';

/**
 * Rate Limiting Middleware
 *
 * Rules:
 *  - /api/*             : max 60 requests per IP per minute
 *  - /webhook/*         : NOT rate-limited (Twilio is the trusted caller;
 *    Twilio signature auth in twilioAuth.js is the defence mechanism)
 *
 * Implementation uses express-rate-limit (already in package.json).
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// General API rate limiter — 60 requests per IP per minute
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn({
      message: 'API rate limit exceeded',
      ip: req.ip,
      path: req.path,
    });
    return res.status(429).json({
      error: 'Too many requests. Please slow down and try again in a minute.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip OPTIONS (CORS preflight) from rate limiting
  skip: (req) => req.method === 'OPTIONS',
});

// ---------------------------------------------------------------------------
// Public tools rate limiter — 10 requests per IP per 5 minutes
// ---------------------------------------------------------------------------
const toolsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn({
      message: 'Tools rate limit exceeded',
      ip: req.ip,
      path: req.path,
    });
    return res.status(429).json({
      error: 'Bahut zyada requests. Kripya kuch der baad phir koshish karein.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

module.exports = { apiLimiter, toolsLimiter };
