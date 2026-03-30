'use strict';

const db = require('../config/db');
const logger = require('../utils/logger');

// Milestone days that trigger certificate messages
const MILESTONE_DAYS = [7, 21, 40, 108];

// Legacy milestone messages (kept for inline text, certificates sent separately)
const MILESTONES = {
  7: '🔥 7-day streak! Saptha — 7 is sacred in Hindu tradition. Keep going!',
  21: '🌟 21 days! They say it takes 21 days to form a habit. You\'ve built a spiritual one.',
  40: '🙏 40 days! Like the 40-day Tapasya of sages, your devotion is deepening.',
  108: '🕉️ 108 days! The most sacred number in Hinduism. You are truly a Sadhak!',
};

/**
 * Records an interaction for a user.
 *
 * Business rules:
 *  - Always update lastInteraction to now
 *  - Increment streakCount by 1 if the last interaction was yesterday or
 *    if this is the user's first-ever interaction (lastInteraction is null)
 *  - Do NOT increment if the user already interacted today (same IST date)
 *  - Returns the milestone message if the new streak hits a milestone; else null
 *  - Also triggers a milestone certificate via viralService for key milestones
 *
 * @param {string} userId
 * @returns {Promise<string|null>} milestone message or null
 */
async function recordInteraction(userId) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, streakCount: true, lastInteraction: true },
  });

  if (!user) {
    logger.warn({ message: 'recordInteraction: user not found', userId });
    return null;
  }

  const now = new Date();
  const todayIST = toISTDateString(now);
  const lastIST = user.lastInteraction ? toISTDateString(user.lastInteraction) : null;

  let newStreakCount = user.streakCount;

  if (lastIST === null) {
    // First ever interaction
    newStreakCount = 1;
  } else if (lastIST === todayIST) {
    // Already interacted today — no increment, just update timestamp
    newStreakCount = user.streakCount;
  } else {
    const daysDiff = daysBetween(user.lastInteraction, now);
    if (daysDiff === 1) {
      // Consecutive day — increment streak
      newStreakCount = user.streakCount + 1;
    } else {
      // Gap of 2+ days — streak resets; this interaction starts a fresh streak of 1
      newStreakCount = 1;
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      streakCount: newStreakCount,
      lastInteraction: now,
    },
  });

  logger.info({
    message: 'recordInteraction completed',
    userId,
    newStreakCount,
    lastInteraction: now.toISOString(),
  });

  // Check for milestone and send certificate if applicable
  if (MILESTONE_DAYS.includes(newStreakCount)) {
    sendMilestoneCertificateAsync(user, newStreakCount);
  }

  // Return milestone message if the new streak hits one
  return getMilestoneMessage(newStreakCount);
}

/**
 * Asynchronously sends a milestone certificate via WhatsApp.
 * Runs in background — does not block the main interaction flow.
 */
function sendMilestoneCertificateAsync(user, streakCount) {
  // Use setImmediate to not block the response
  setImmediate(async () => {
    try {
      const viralService = require('./viralService');
      const { sendWhatsAppMessage } = require('./messageRouterService');

      const certificate = viralService.generateMilestoneCertificate(user, streakCount);
      if (certificate) {
        await sendWhatsAppMessage(user.phone, certificate);
        logger.info({ message: 'Milestone certificate sent', userId: user.id, streakCount });
      }
    } catch (err) {
      logger.error({
        message: 'Failed to send milestone certificate',
        userId: user.id,
        streakCount,
        error: err.message,
      });
    }
  });
}

/**
 * Scans all users and resets streaks that have been inactive for 2+ days.
 * Called nightly by streakCheckJob.
 *
 * @returns {Promise<number>} count of users whose streaks were reset
 */
async function checkAndResetStreaks() {
  const now = new Date();

  // A user needs a reset if their lastInteraction is 2 or more calendar days ago
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 1); // yesterday midnight IST boundary
  const yesterdayISTStart = startOfDayIST(cutoff);

  const staleUsers = await db.user.findMany({
    where: {
      streakCount: { gt: 0 },
      lastInteraction: {
        lt: yesterdayISTStart,
      },
    },
    select: { id: true, streakCount: true, lastInteraction: true },
  });

  if (staleUsers.length === 0) {
    logger.info({ message: 'checkAndResetStreaks: no stale streaks found' });
    return 0;
  }

  const ids = staleUsers.map((u) => u.id);

  await db.user.updateMany({
    where: { id: { in: ids } },
    data: { streakCount: 0 },
  });

  logger.info({
    message: 'checkAndResetStreaks: reset streaks',
    count: ids.length,
    userIds: ids,
  });

  return ids.length;
}

/**
 * Returns the milestone message for the given streak count, or null if not a milestone.
 *
 * @param {number} streak
 * @returns {string|null}
 */
function getMilestoneMessage(streak) {
  return MILESTONES[streak] || null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Date to an IST date string (YYYY-MM-DD).
 */
function toISTDateString(date) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * Returns the start of the IST day (midnight) for a given Date as a UTC Date.
 */
function startOfDayIST(date) {
  const istDateStr = toISTDateString(date);
  // Parse as IST midnight: YYYY-MM-DDT00:00:00+05:30
  return new Date(`${istDateStr}T00:00:00+05:30`);
}

/**
 * Returns the absolute number of calendar days between two dates (IST).
 */
function daysBetween(dateA, dateB) {
  const a = toISTDateString(dateA);
  const b = toISTDateString(dateB);
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.abs(Math.round((msB - msA) / (1000 * 60 * 60 * 24)));
}

module.exports = {
  recordInteraction,
  checkAndResetStreaks,
  getMilestoneMessage,
};
