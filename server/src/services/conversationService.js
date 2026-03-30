'use strict';

const db = require('../config/db');

/**
 * Saves a message to the Conversation table.
 *
 * @param {string} userId
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @returns {Promise<object>}
 */
async function saveMessage(userId, role, content) {
  return db.conversation.create({
    data: {
      userId,
      role,
      content,
    },
  });
}

/**
 * Retrieves the last N conversation turns for a user, ordered oldest-first.
 *
 * @param {string} userId
 * @param {number} [limit=5]
 * @returns {Promise<Array<{role: string, content: string, createdAt: Date}>>}
 */
async function getHistory(userId, limit = 5) {
  const messages = await db.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { role: true, content: true, createdAt: true },
  });

  // Reverse to get oldest-first order
  return messages.reverse();
}

module.exports = { saveMessage, getHistory };
