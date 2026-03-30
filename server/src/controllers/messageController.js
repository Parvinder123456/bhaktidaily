'use strict';

/**
 * TASK-022 · Message Controller
 *
 * All endpoints require a valid JWT (req.user set by authenticate middleware).
 *
 * GET /api/messages          → paginated list of daily messages (10/page)
 * GET /api/messages/:id      → single daily message by ID
 *
 * Pagination: ?page=1 (1-indexed, default 1)
 */

const db = require('../config/db');
const logger = require('../utils/logger');

const PAGE_SIZE = 10;

/**
 * GET /api/messages?page=N
 * Returns a paginated list of the authenticated user's daily messages,
 * newest first.
 */
async function getMessages(req, res) {
  const { userId } = req.user;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [messages, total] = await Promise.all([
    db.dailyMessage.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        date: true,
        horoscope: true,
        verseText: true,
        verseId: true,
        challenge: true,
        sentAt: true,
        opened: true,
        replied: true,
        createdAt: true,
      },
    }),
    db.dailyMessage.count({ where: { userId } }),
  ]);

  logger.info({ message: 'messageController: getMessages', userId, page, count: messages.length });

  return res.status(200).json({
    messages,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
      hasNextPage: page * PAGE_SIZE < total,
      hasPrevPage: page > 1,
    },
  });
}

/**
 * GET /api/messages/:id
 * Returns a single daily message by ID.
 * Only returns messages belonging to the authenticated user.
 */
async function getMessage(req, res) {
  const { userId } = req.user;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  const message = await db.dailyMessage.findFirst({
    where: { id, userId }, // userId guard prevents cross-user access
    select: {
      id: true,
      date: true,
      horoscope: true,
      verseText: true,
      verseId: true,
      challenge: true,
      sentAt: true,
      opened: true,
      replied: true,
      createdAt: true,
    },
  });

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Mark as opened if it hasn't been already
  if (!message.opened) {
    await db.dailyMessage.update({
      where: { id },
      data: { opened: true },
    }).catch(() => { /* non-critical — don't fail the response */ });
  }

  return res.status(200).json(message);
}

module.exports = { getMessages, getMessage };
