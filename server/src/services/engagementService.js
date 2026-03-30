'use strict';

const db = require('../config/db');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Tier thresholds
// ---------------------------------------------------------------------------
const TIER_HIGH_THRESHOLD = 0.30;
const TIER_MEDIUM_THRESHOLD = 0.10;

// ---------------------------------------------------------------------------
// Tier tone injection templates
// ---------------------------------------------------------------------------
const TONE_INJECTIONS = {
  high: 'This user is highly engaged — they reply often and are spiritually invested. Ask a reflective question at the end of the message. Create dialogue. Use cliffhangers like "Kal ki raashifal mein ek baat aur hai...". Treat them as a spiritual dialogue partner.',
  medium: 'This user engages occasionally. Mix punchy statements with one light question. Keep them curious without demanding too much. Occasionally invite a reply: "Aapka kya anubhav raha?".',
  low: 'This user rarely replies. Make the message punchy, shareable, and complete on its own. Do NOT end with questions. Write for virality — something they will screenshot and send to family.',
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Recalculate engagement profile for a single user.
 * Computes: replyRate, avgReplyMinutes, peakHour, tier, totalMessages30d.
 * Stores result in User.engagementProfile (Json field).
 * @param {string} userId
 * @returns {Promise<Object>} The computed profile
 */
async function updateEngagementProfile(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  // Fetch all content logs for the last 30 days
  const logs = await db.contentLog.findMany({
    where: {
      userId,
      date: { gte: thirtyDaysAgo },
    },
    select: {
      gotReply: true,
      replyAt: true,
      createdAt: true,
      contentType: true,
    },
  });

  const totalMessages30d = logs.length;

  if (totalMessages30d === 0) {
    // No data — default to low tier
    const profile = {
      replyRate: 0,
      avgReplyMinutes: null,
      peakHour: null,
      tier: 'low',
      totalMessages30d: 0,
      lastCalculated: new Date().toISOString(),
    };

    await db.user.update({
      where: { id: userId },
      data: { engagementProfile: profile },
    });

    return profile;
  }

  const replies = logs.filter(l => l.gotReply && l.replyAt);
  const replyRate = replies.length / totalMessages30d;

  // Average reply time in minutes
  let avgReplyMinutes = null;
  if (replies.length > 0) {
    const totalMinutes = replies.reduce((sum, l) => {
      const diffMs = new Date(l.replyAt) - new Date(l.createdAt);
      return sum + (diffMs / 60_000);
    }, 0);
    avgReplyMinutes = Math.round(totalMinutes / replies.length);
  }

  // Peak reply hour (0-23 UTC) — hour when most replies come in
  let peakHour = null;
  if (replies.length > 0) {
    const hourCounts = {};
    for (const l of replies) {
      const hour = new Date(l.replyAt).getUTCHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    peakHour = parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0], 10);
  }

  // Tier assignment
  let tier;
  if (replyRate >= TIER_HIGH_THRESHOLD) {
    tier = 'high';
  } else if (replyRate >= TIER_MEDIUM_THRESHOLD) {
    tier = 'medium';
  } else {
    tier = 'low';
  }

  const profile = {
    replyRate: Math.round(replyRate * 1000) / 1000, // 3 decimal places
    avgReplyMinutes,
    peakHour,
    tier,
    totalMessages30d,
    lastCalculated: new Date().toISOString(),
  };

  await db.user.update({
    where: { id: userId },
    data: { engagementProfile: profile },
  });

  return profile;
}

/**
 * Get tone injection text based on engagement tier.
 * @param {Object|null} engagementProfile - User's engagement profile JSON
 * @returns {string} Prompt injection text
 */
function getToneInjection(engagementProfile) {
  const tier = engagementProfile?.tier || 'low';
  return TONE_INJECTIONS[tier] || TONE_INJECTIONS.low;
}

/**
 * Get engagement distribution across all onboarded users.
 * @returns {Promise<{ high: number, medium: number, low: number, total: number }>}
 */
async function getEngagementDistribution() {
  const users = await db.user.findMany({
    where: { isOnboarded: true },
    select: { engagementProfile: true },
  });

  const dist = { high: 0, medium: 0, low: 0, total: users.length };

  for (const user of users) {
    const profile = user.engagementProfile;
    const tier = profile?.tier || 'low';
    if (tier in dist) dist[tier]++;
    else dist.low++;
  }

  return dist;
}

module.exports = {
  updateEngagementProfile,
  getToneInjection,
  getEngagementDistribution,
  TONE_INJECTIONS,
};
