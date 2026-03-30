'use strict';

/**
 * Data API Routes
 *
 * All routes require a valid JWT — the authenticate middleware is applied
 * to the entire router in app.js via:
 *   app.use('/api', authenticate, apiRouter)
 *
 * Routes:
 *   GET    /api/user/profile    → userController.getProfile
 *   PUT    /api/user/profile    → userController.updateProfile
 *   GET    /api/user/streak     → userController.getStreak
 *   GET    /api/messages        → messageController.getMessages
 *   GET    /api/messages/:id    → messageController.getMessage
 *   GET    /api/media           → mediaController.listMedia
 *   POST   /api/media           → mediaController.upsertMedia
 *   DELETE /api/media/:key      → mediaController.deleteMedia
 *
 * Note: /api/auth/* is mounted separately and does NOT require the JWT
 * middleware since those are the login endpoints.
 */

const express = require('express');
const { getProfile, updateProfile, getStreak } = require('../controllers/userController');
const { getMessages, getMessage } = require('../controllers/messageController');
const { listMedia, upsertMedia, deleteMedia } = require('../controllers/mediaController');

const router = express.Router();

// User profile
router.get('/user/profile', getProfile);
router.put('/user/profile', updateProfile);

// Streak
router.get('/user/streak', getStreak);

// Daily messages
router.get('/messages', getMessages);
router.get('/messages/:id', getMessage);

// Media configuration
router.get('/media', listMedia);
router.post('/media', upsertMedia);
router.delete('/media/:key', deleteMedia);

module.exports = router;
