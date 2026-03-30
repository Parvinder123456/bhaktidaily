'use strict';

/**
 * Express application factory.
 *
 * Route structure:
 *   GET  /health                  — health check (no auth, no rate limit)
 *   POST /webhook/whatsapp        — Twilio webhook (signature auth, no rate limit)
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
app.use(
  cors({
    origin: process.env.DASHBOARD_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
