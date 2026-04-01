'use strict';

/**
 * Express application factory.
 *
 * Route structure:
 *   GET  /health                  — health check (no auth, no rate limit)
 *   POST /webhook/whatsapp        — Twilio webhook (signature auth, no rate limit)
 *   POST /tools/name-meaning      — public viral tool (toolsLimiter, no auth)
 *   GET  /tools/panchang/today    — public viral tool (toolsLimiter, no auth)
 *   POST /tools/panchang/muhurat  — public viral tool (toolsLimiter, no auth)
 *   POST /tools/raashifal         — public viral tool (toolsLimiter, no auth)
 *   POST /tools/dream-interpret   — public viral tool (toolsLimiter, no auth)
 *   POST /tools/dharma-naam       — public viral tool (toolsLimiter, no auth)
 *   POST /tools/leads             — lead capture (toolsLimiter, no auth)
 *   POST /api/auth/login           — phone + password login
 *   GET  /api/user/profile        — JWT required + 60 req/IP/min
 *   PUT  /api/user/profile        — JWT required + 60 req/IP/min
 *   GET  /api/user/streak         — JWT required + 60 req/IP/min
 *   GET  /api/messages            — JWT required + 60 req/IP/min
 *   GET  /api/messages/:id        — JWT required + 60 req/IP/min
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');

const indexRouter = require('./routes/index');
const webhookRouter = require('./routes/webhook');
const toolsRouter = require('./routes/tools');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const authenticate = require('./middleware/authenticate');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------
app.use(helmet());

// CORS — allow the Next.js dashboard origin in production; wide-open in dev
const ALLOWED_ORIGINS = [
  'https://bhaktidaily.online',
  'https://www.bhaktidaily.online',
];
// Also honour the env var in case it points to a preview/staging URL
if (process.env.DASHBOARD_URL && !ALLOWED_ORIGINS.includes(process.env.DASHBOARD_URL)) {
  ALLOWED_ORIGINS.push(process.env.DASHBOARD_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== 'production' ||
        ALLOWED_ORIGINS.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check — no auth, no rate limit
app.use('/', indexRouter);

// WhatsApp webhook — no rate limit (Twilio signature is the auth mechanism)
app.use('/webhook', webhookRouter);

// Public viral tools — no auth, custom rate limit (toolsLimiter applied inside router)
app.use('/tools', toolsRouter);

// Auth routes — password-based login, no JWT required.
// Mounted BEFORE the protected /api/* block so they are accessible without a JWT.
app.use('/api/auth', authRouter);

// Protected data API — general rate limit (60 req/IP/min) + JWT authentication
// Note: /api/auth/* is already matched above and will not reach this middleware chain
app.use('/api', apiLimiter, authenticate, apiRouter);

// Admin API — self-improvement intelligence layer (same JWT auth, admin-only endpoints)
app.use('/api/admin', apiLimiter, authenticate, adminRouter);

// ---------------------------------------------------------------------------
// Error handling (must be last)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
