'use strict';

const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Assign a prompt variant to a user (balanced distribution).
 * If user already has one for this featureKey, return existing.
 * Assignment favours the variant with the fewest users (load-balancing).
 * @param {string} userId
 * @param {string} featureKey - Default "bhagwan_sandesh"
 * @returns {Promise<string>} variantId
 */
async function assignVariant(userId, featureKey = 'bhagwan_sandesh') {
  // Return existing assignment if present
  const existing = await db.userPromptVariant.findUnique({
    where: { userId_featureKey: { userId, featureKey } },
    select: { variantId: true },
  });

  if (existing) return existing.variantId;

  // Get all active, verified variants for this feature
  const variants = await db.promptVariant.findMany({
    where: { featureKey, isActive: true, verified: true },
    select: { id: true },
  });

  if (variants.length === 0) return null;

  // Count current assignments per variant
  const counts = await Promise.all(
    variants.map(async (v) => {
      const count = await db.userPromptVariant.count({
        where: { variantId: v.id },
      });
      return { variantId: v.id, count };
    })
  );

  // Pick the variant with the fewest assignments
  counts.sort((a, b) => a.count - b.count);
  const chosenVariantId = counts[0].variantId;

  // Create the assignment
  await db.userPromptVariant.create({
    data: { userId, variantId: chosenVariantId, featureKey },
  });

  logger.debug({ message: 'Variant assigned', userId, featureKey, variantId: chosenVariantId });
  return chosenVariantId;
}

/**
 * Get the prompt text for a variant.
 * @param {string} variantId
 * @returns {Promise<string|null>} Prompt text or null
 */
async function getVariantPrompt(variantId) {
  if (!variantId) return null;

  const variant = await db.promptVariant.findUnique({
    where: { id: variantId },
    select: { promptText: true, isActive: true, verified: true },
  });

  if (!variant || !variant.isActive || !variant.verified) return null;
  return variant.promptText;
}

/**
 * Get the variant style for a user.
 * @param {string} userId
 * @param {string} featureKey
 * @returns {Promise<string|null>} Style string (e.g., "father", "friend", "guru")
 */
async function getUserVariantStyle(userId, featureKey = 'bhagwan_sandesh') {
  const assignment = await db.userPromptVariant.findUnique({
    where: { userId_featureKey: { userId, featureKey } },
    include: { variant: { select: { style: true } } },
  });

  return assignment?.variant?.style || null;
}

/**
 * Get performance stats for all active variants of a feature.
 * Reply rates are computed from ContentLog.contentTag matching variant style.
 * @param {string} featureKey
 * @returns {Promise<Array<{ id, style, lastReplyRate, userCount, isWinner }>>}
 */
async function getVariantPerformance(featureKey = 'bhagwan_sandesh') {
  const variants = await db.promptVariant.findMany({
    where: { featureKey, isActive: true },
    include: {
      _count: { select: { userAssignments: true } },
    },
    orderBy: { lastReplyRate: 'desc' },
  });

  if (variants.length === 0) return [];

  const results = variants.map((v, idx) => ({
    id: v.id,
    style: v.style,
    lastReplyRate: v.lastReplyRate || 0,
    userCount: v._count.userAssignments,
    isWinner: idx === 0 && (v.lastReplyRate || 0) > 0,
  }));

  return results;
}

/**
 * Update lastReplyRate for all variants of a feature based on ContentLog data.
 * @param {string} featureKey
 * @returns {Promise<void>}
 */
async function refreshVariantReplyRates(featureKey = 'bhagwan_sandesh') {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  const variants = await db.promptVariant.findMany({
    where: { featureKey, isActive: true },
    select: { id: true, style: true },
  });

  for (const variant of variants) {
    // Count logs for this variant style in the last 7 days
    const totalSent = await db.contentLog.count({
      where: {
        contentType: featureKey,
        contentTag: variant.style,
        date: { gte: sevenDaysAgo },
      },
    });

    const totalReplies = await db.contentLog.count({
      where: {
        contentType: featureKey,
        contentTag: variant.style,
        date: { gte: sevenDaysAgo },
        gotReply: true,
      },
    });

    const replyRate = totalSent > 0 ? totalReplies / totalSent : 0;

    await db.promptVariant.update({
      where: { id: variant.id },
      data: {
        lastReplyRate: replyRate,
        lastEvaluatedAt: new Date(),
      },
    });
  }
}

module.exports = {
  assignVariant,
  getVariantPrompt,
  getUserVariantStyle,
  getVariantPerformance,
  refreshVariantReplyRates,
};
