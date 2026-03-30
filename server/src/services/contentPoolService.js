'use strict';

const db = require('../config/db');
const contentLogService = require('./contentLogService');
const logger = require('../utils/logger');

/**
 * Pick a fresh content item from the pool that the user hasn't seen.
 * Uses weighted selection favoring higher quality scores.
 * Only returns content where isActive = true and verified = true.
 * @param {string} userId
 * @param {string} type - Content type (e.g., "fact", "hanuman_chaupai")
 * @returns {Promise<Object|null>} ContentPool record or null if pool is empty
 */
async function pickFreshContent(userId, type) {
  const seenIds = await contentLogService.getSeenContentIds(userId, type, 60);

  // Get all eligible unseen content
  const candidates = await db.contentPool.findMany({
    where: {
      type,
      isActive: true,
      verified: true,
      id: { notIn: seenIds.length > 0 ? seenIds : ['__none__'] },
    },
    orderBy: { qualityScore: 'desc' },
    take: 20, // limit candidate pool to top 20 by quality
  });

  if (candidates.length === 0) {
    logger.warn({ message: 'ContentPool empty for user', userId, type });
    return null;
  }

  // Use weighted selection: quality score + baseline to avoid cold-start exclusion
  const BASELINE = 0.5;
  const weights = candidates.map(c => Math.max(c.qualityScore, 0) + BASELINE);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    random -= weights[i];
    if (random <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
}

/**
 * Update quality score for a content item based on engagement data.
 * Computes reply rate from ContentLog and updates qualityScore.
 * @param {string} contentId - ContentPool ID
 * @returns {Promise<Object>} Updated ContentPool record
 */
async function updateQualityScore(contentId) {
  const pool = await db.contentPool.findUnique({ where: { id: contentId } });
  if (!pool) throw new Error(`ContentPool item not found: ${contentId}`);

  // Find the content type to query the right logs
  const totalSent = await db.contentLog.count({
    where: { contentId },
  });

  const totalReplies = await db.contentLog.count({
    where: { contentId, gotReply: true },
  });

  // Quality score = reply rate (0.0 to 1.0), keep at 0 if never sent
  const qualityScore = totalSent > 0 ? totalReplies / totalSent : 0;

  return db.contentPool.update({
    where: { id: contentId },
    data: { qualityScore },
  });
}

/**
 * Get pool level statistics for dashboard display.
 * @returns {Promise<{ trivia: { unused: number, total: number, lastGenerated: Date|null }, facts: Object, chaupais: Object }>}
 */
async function getPoolLevels() {
  const types = [
    { key: 'trivia', type: 'trivia_generated' },
    { key: 'facts', type: 'fact' },
    { key: 'chaupais', type: 'hanuman_chaupai' },
  ];

  const result = {};

  for (const { key, type } of types) {
    const total = await db.contentPool.count({
      where: { type, isActive: true, verified: true },
    });

    // "Unused" = items with usedCount = 0
    const unused = await db.contentPool.count({
      where: { type, isActive: true, verified: true, usedCount: 0 },
    });

    // Last generated: most recently created item of this type
    const latest = await db.contentPool.findFirst({
      where: { type, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    result[key] = {
      unused,
      total,
      lastGenerated: latest?.createdAt || null,
    };
  }

  return result;
}

/**
 * Increment usedCount when content is sent.
 * @param {string} contentId
 * @returns {Promise<Object>} Updated ContentPool record
 */
async function markUsed(contentId) {
  return db.contentPool.update({
    where: { id: contentId },
    data: { usedCount: { increment: 1 } },
  });
}

/**
 * Batch-update quality scores for all active pool items.
 * Run periodically to keep scores current.
 * @returns {Promise<{ updated: number }>}
 */
async function refreshAllQualityScores() {
  const items = await db.contentPool.findMany({
    where: { isActive: true, verified: true, usedCount: { gt: 0 } },
    select: { id: true },
  });

  let updated = 0;
  for (const item of items) {
    try {
      await updateQualityScore(item.id);
      updated++;
    } catch (err) {
      logger.error({ message: 'Failed to update quality score', contentId: item.id, error: err.message });
    }
  }

  logger.info({ message: 'Quality scores refreshed', updated });
  return { updated };
}

module.exports = {
  pickFreshContent,
  updateQualityScore,
  getPoolLevels,
  markUsed,
  refreshAllQualityScores,
};
