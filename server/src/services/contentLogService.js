'use strict';

const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Log a piece of content sent to a user.
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.contentType - One of: verse, trivia, fact, raashifal, bhagwan_sandesh, bonus, streak_recovery
 * @param {string|null} params.contentId - FK to source table (null for generated content)
 * @param {string|null} params.contentTag - Theme tag (e.g., "gita", "practical", "temples")
 * @param {Date} params.date - Date of the message (Date object, date-only)
 * @returns {Promise<Object>} Created ContentLog record
 */
async function logContent({ userId, contentType, contentId = null, contentTag = null, date }) {
  try {
    const log = await db.contentLog.create({
      data: {
        userId,
        contentType,
        contentId,
        contentTag,
        date,
      },
    });
    logger.debug({ message: 'ContentLog created', userId, contentType, contentTag });
    return log;
  } catch (err) {
    // Non-fatal — log error but don't crash the message pipeline
    logger.error({ message: 'Failed to create ContentLog', error: err.message, userId, contentType });
    return null;
  }
}

/**
 * Mark that a user replied to content on a given date.
 * Called from webhook.js when an inbound message is received.
 * @param {string} userId
 * @param {Date} date - Date to match (date-only)
 * @param {string} contentType - Which content type to mark
 * @returns {Promise<{ count: number }>}
 */
async function markReply(userId, date, contentType) {
  try {
    const result = await db.contentLog.updateMany({
      where: {
        userId,
        date,
        contentType,
        gotReply: false, // only update if not already replied
      },
      data: {
        gotReply: true,
        replyAt: new Date(),
      },
    });
    logger.debug({ message: 'ContentLog reply marked', userId, contentType, count: result.count });
    return result;
  } catch (err) {
    logger.error({ message: 'Failed to mark ContentLog reply', error: err.message, userId, contentType });
    return { count: 0 };
  }
}

/**
 * Mark replies for ALL content types on a given date.
 * Used when a user sends any reply — marks all content sent that day.
 * @param {string} userId
 * @param {Date} date - Date to match (date-only)
 * @returns {Promise<{ count: number }>}
 */
async function markReplyAll(userId, date) {
  try {
    const result = await db.contentLog.updateMany({
      where: {
        userId,
        date,
        gotReply: false,
      },
      data: {
        gotReply: true,
        replyAt: new Date(),
      },
    });
    logger.debug({ message: 'ContentLog all replies marked', userId, count: result.count });
    return result;
  } catch (err) {
    logger.error({ message: 'Failed to mark all ContentLog replies', error: err.message, userId });
    return { count: 0 };
  }
}

/**
 * Get IDs of content a user has already seen within the last N days.
 * Used for deduplication.
 * @param {string} userId
 * @param {string} contentType
 * @param {number} days - Lookback window (default 60)
 * @returns {Promise<string[]>} Array of contentId strings (filtered to non-null)
 */
async function getSeenContentIds(userId, contentType, days = 60) {
  const cutoff = new Date(Date.now() - days * 86_400_000);

  const logs = await db.contentLog.findMany({
    where: {
      userId,
      contentType,
      date: { gte: cutoff },
      contentId: { not: null },
    },
    select: { contentId: true },
  });

  return logs.map(l => l.contentId).filter(Boolean);
}

/**
 * Get aggregated quality scores for a content type.
 * Returns contentId -> reply rate mapping.
 * @param {string} contentType
 * @param {number} limit
 * @returns {Promise<Array<{ contentId: string, totalSent: number, totalReplies: number, replyRate: number }>>}
 */
async function getContentScores(contentType, limit = 50) {
  // Use raw aggregation via groupBy
  const grouped = await db.contentLog.groupBy({
    by: ['contentId'],
    where: {
      contentType,
      contentId: { not: null },
    },
    _count: {
      id: true,
      gotReply: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  // Compute reply rate for each contentId
  const scores = await Promise.all(
    grouped.map(async (row) => {
      const totalSent = row._count.id;
      const totalReplies = await db.contentLog.count({
        where: {
          contentType,
          contentId: row.contentId,
          gotReply: true,
        },
      });
      return {
        contentId: row.contentId,
        totalSent,
        totalReplies,
        replyRate: totalSent > 0 ? totalReplies / totalSent : 0,
      };
    })
  );

  return scores;
}

/**
 * Pick content using weighted random selection based on reply rates.
 * Higher-performing content is more likely to be picked.
 * Content with zero reply data gets a baseline weight (avoids cold-start exclusion).
 * @param {string} userId
 * @param {string} contentType
 * @param {Array} candidates - Array of content objects with `id` field
 * @returns {Promise<Object>} Selected content item
 */
async function pickWeightedContent(userId, contentType, candidates) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Get reply rate data for all candidate IDs
  const candidateIds = candidates.map(c => c.id);
  const scores = await db.contentLog.groupBy({
    by: ['contentId'],
    where: {
      contentType,
      contentId: { in: candidateIds },
    },
    _count: { id: true },
  });

  const replyCountMap = {};
  for (const s of scores) {
    const replies = await db.contentLog.count({
      where: { contentType, contentId: s.contentId, gotReply: true },
    });
    const total = s._count.id;
    replyCountMap[s.contentId] = total > 0 ? replies / total : 0;
  }

  // Assign weights: reply rate + 0.1 baseline so new content isn't excluded
  const BASELINE = 0.1;
  const weights = candidates.map(c => {
    const rate = replyCountMap[c.id] !== undefined ? replyCountMap[c.id] : 0;
    return rate + BASELINE;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    random -= weights[i];
    if (random <= 0) return candidates[i];
  }

  // Fallback (floating point edge case)
  return candidates[candidates.length - 1];
}

/**
 * Get reply rate stats for a single user, grouped by content type.
 * @param {string} userId
 * @param {number} days - Lookback window (default 30)
 * @returns {Promise<Object>} Map of contentType -> { sent, replies, replyRate }
 */
async function getUserReplyStats(userId, days = 30) {
  const cutoff = new Date(Date.now() - days * 86_400_000);

  const grouped = await db.contentLog.groupBy({
    by: ['contentType'],
    where: {
      userId,
      date: { gte: cutoff },
    },
    _count: { id: true },
  });

  const stats = {};
  for (const row of grouped) {
    const replies = await db.contentLog.count({
      where: {
        userId,
        contentType: row.contentType,
        date: { gte: cutoff },
        gotReply: true,
      },
    });
    const sent = row._count.id;
    stats[row.contentType] = {
      sent,
      replies,
      replyRate: sent > 0 ? replies / sent : 0,
    };
  }

  return stats;
}

module.exports = {
  logContent,
  markReply,
  markReplyAll,
  getSeenContentIds,
  getContentScores,
  pickWeightedContent,
  getUserReplyStats,
};
