'use strict';

const db = require('../config/db');
const { getBonusMessageQueue, JOB_NAMES } = require('../config/queues');
const logger = require('../utils/logger');

/**
 * Day-of-week to bonus message type mapping.
 *
 * This job is triggered at different times:
 * - 12:00 PM IST (Monday) — trivia question
 * - 6:00 PM IST (Monday) — trivia answer reveal
 * - 8:00 AM IST (Tue-Sun) — day-specific bonus message
 *
 * The `scanType` in job data determines which mapping to use.
 */
const DAY_BONUS_TYPES = {
  // scanType: 'morning' — 8 AM IST messages (Tue-Sun)
  morning: {
    2: 'tuesday_hanuman',     // Tuesday
    3: 'wednesday_dream',     // Wednesday
    4: 'thursday_fact',       // Thursday
    5: 'friday_naam',         // Friday
    6: 'saturday_shani',      // Saturday
    0: 'sunday_qa',           // Sunday
  },
  // scanType: 'trivia_question' — 12 PM IST (Monday only)
  trivia_question: {
    1: 'monday_trivia_question',
  },
  // scanType: 'trivia_answer' — 6 PM IST (Monday only)
  trivia_answer: {
    1: 'monday_trivia_answer',
  },
};

/**
 * BullMQ job processor: scans all onboarded users and enqueues
 * appropriate bonus message jobs based on the current IST day.
 *
 * Job data shape: { scanType: 'morning' | 'trivia_question' | 'trivia_answer' }
 */
async function processBonusScan(job) {
  const scanType = job.data?.scanType || 'morning';

  // Current IST day of week
  const nowIST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  const dayOfWeek = nowIST.getDay();
  const todayStr = nowIST.toLocaleDateString('en-CA');

  logger.info({
    message: 'bonusScanJob started',
    jobId: job.id,
    scanType,
    dayOfWeek,
    todayStr,
  });

  const typeMap = DAY_BONUS_TYPES[scanType];
  if (!typeMap) {
    logger.warn({ message: 'Unknown scan type', scanType });
    return { enqueued: 0 };
  }

  const bonusType = typeMap[dayOfWeek];
  if (!bonusType) {
    logger.info({ message: 'No bonus message for this day/scanType combo', dayOfWeek, scanType });
    return { enqueued: 0 };
  }

  // Find all onboarded users
  const users = await db.user.findMany({
    where: { isOnboarded: true },
    select: { id: true, phone: true },
  });

  if (users.length === 0) {
    logger.info({ message: 'bonusScanJob: no onboarded users' });
    return { enqueued: 0 };
  }

  const queue = getBonusMessageQueue();

  const enqueuedJobs = await Promise.all(
    users.map((user) =>
      queue.add(
        JOB_NAMES.SEND_BONUS_MESSAGE,
        { userId: user.id, type: bonusType },
        {
          // Deduplication key: one bonus per user per day per type
          jobId: `bonus-${user.id}-${todayStr}-${bonusType}`,
        }
      )
    )
  );

  logger.info({
    message: 'bonusScanJob: jobs enqueued',
    count: enqueuedJobs.filter(Boolean).length,
    bonusType,
  });

  return { enqueued: enqueuedJobs.length, type: bonusType };
}

module.exports = { processBonusScan };
