'use strict';

const db = require('../config/db');
const { refreshVariantReplyRates } = require('../services/variantService');
const logger = require('../utils/logger');

const FEATURE_KEY = 'bhagwan_sandesh';
const MOVE_PERCENT = 0.20; // move 20% of worst variant's users

/**
 * Evaluate variant performance over last 7 days.
 * Move 20% of worst variant's users to best variant.
 * Update lastReplyRate and lastEvaluatedAt on all variants.
 * Skip if no clear winner (all rates equal or no data).
 * @param {Object} job - BullMQ job
 * @returns {Promise<{ best, worst, moved } | { action: 'skipped', reason: string }>}
 */
async function processVariantRotation(job) {
  logger.info({ message: 'variantRotationJob started', jobId: job.id });
  const startedAt = Date.now();

  // Step 1: Refresh all reply rates from ContentLog data
  await refreshVariantReplyRates(FEATURE_KEY);

  // Step 2: Load updated variant stats
  const variants = await db.promptVariant.findMany({
    where: { featureKey: FEATURE_KEY, isActive: true, verified: true },
    include: { _count: { select: { userAssignments: true } } },
    orderBy: { lastReplyRate: 'desc' },
  });

  if (variants.length < 2) {
    logger.info({ message: 'variantRotationJob: fewer than 2 variants, skipping' });
    return { action: 'skipped', reason: 'fewer than 2 active variants' };
  }

  const best = variants[0];
  const worst = variants[variants.length - 1];

  // Step 3: Check if there's a meaningful difference
  const bestRate = best.lastReplyRate || 0;
  const worstRate = worst.lastReplyRate || 0;

  if (bestRate === worstRate || (bestRate === 0 && worstRate === 0)) {
    logger.info({ message: 'variantRotationJob: no clear winner, skipping rotation' });
    return { action: 'skipped', reason: 'no clear winner (equal reply rates)' };
  }

  // Require at least 5% absolute difference to rotate
  if (bestRate - worstRate < 0.05) {
    logger.info({ message: 'variantRotationJob: difference too small, skipping', bestRate, worstRate });
    return { action: 'skipped', reason: 'rate difference < 5% threshold' };
  }

  // Step 4: Move 20% of worst variant users to best variant
  const worstUsers = await db.userPromptVariant.findMany({
    where: { variantId: worst.id, featureKey: FEATURE_KEY },
    select: { id: true, userId: true },
    orderBy: { assignedAt: 'asc' }, // move the oldest assignments first
  });

  const moveCount = Math.max(1, Math.floor(worstUsers.length * MOVE_PERCENT));
  const toMove = worstUsers.slice(0, moveCount);

  let moved = 0;
  for (const assignment of toMove) {
    try {
      await db.userPromptVariant.update({
        where: { id: assignment.id },
        data: { variantId: best.id, assignedAt: new Date() },
      });
      moved++;
    } catch (err) {
      logger.error({ message: 'Failed to move user variant', userId: assignment.userId, error: err.message });
    }
  }

  const duration = Date.now() - startedAt;
  const result = {
    best: { style: best.style, replyRate: bestRate },
    worst: { style: worst.style, replyRate: worstRate },
    moved,
  };

  logger.info({
    message: 'variantRotationJob completed',
    jobId: job.id,
    durationMs: duration,
    ...result,
  });

  return result;
}

module.exports = { processVariantRotation };
