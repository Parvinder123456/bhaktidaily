'use strict';

/**
 * TASK-022 · User Controller
 *
 * All endpoints require a valid JWT (req.user set by authenticate middleware).
 *
 * GET  /api/user/profile  → returns the authenticated user's profile
 * PUT  /api/user/profile  → updates rashi, language, and/or deliveryTime
 * GET  /api/user/streak   → returns streakCount, lastInteraction, and
 *                           the last 30 daily messages as a history proxy
 */

const db = require('../config/db');
const logger = require('../utils/logger');

// Fields we allow a user to update via the API
const UPDATABLE_FIELDS = ['rashi', 'language', 'deliveryTime'];

/**
 * GET /api/user/profile
 * Returns the authenticated user's profile (phone is omitted for privacy).
 */
async function getProfile(req, res) {
  const { userId } = req.user;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      rashi: true,
      language: true,
      deliveryTime: true,
      timezone: true,
      isOnboarded: true,
      isPremium: true,
      streakCount: true,
      lastInteraction: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  logger.info({ message: 'userController: getProfile', userId });
  return res.status(200).json(user);
}

/**
 * PUT /api/user/profile
 * Updates only the fields provided in the request body.
 * Allowed fields: rashi, language, deliveryTime.
 */
async function updateProfile(req, res) {
  const { userId } = req.user;
  const body = req.body || {};

  // Extract only the allowed fields that are present in the body
  const updates = {};
  for (const field of UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: `No updatable fields provided. Allowed: ${UPDATABLE_FIELDS.join(', ')}`,
    });
  }

  // Validate deliveryTime format (HH:MM)
  if (updates.deliveryTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(updates.deliveryTime)) {
      return res.status(400).json({ error: 'deliveryTime must be in HH:MM format (e.g. 07:00)' });
    }
  }

  // Validate language
  if (updates.language && !['en', 'hi', 'hinglish', 'both'].includes(updates.language)) {
    return res.status(400).json({ error: 'language must be one of: en, hi, hinglish, both' });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: updates,
    select: {
      id: true,
      name: true,
      rashi: true,
      language: true,
      deliveryTime: true,
      streakCount: true,
      lastInteraction: true,
    },
  });

  logger.info({ message: 'userController: updateProfile', userId, updates });
  return res.status(200).json(updated);
}

/**
 * GET /api/user/streak
 * Returns the user's current streak stats plus a history of recent interactions
 * derived from daily messages (newest first, up to 30 entries).
 */
async function getStreak(req, res) {
  const { userId } = req.user;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { streakCount: true, lastInteraction: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Recent daily messages as a streak history proxy
  const history = await db.dailyMessage.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 30,
    select: {
      id: true,
      date: true,
      sentAt: true,
      replied: true,
    },
  });

  return res.status(200).json({
    streakCount: user.streakCount,
    lastInteraction: user.lastInteraction,
    history,
  });
}

module.exports = { getProfile, updateProfile, getStreak };
