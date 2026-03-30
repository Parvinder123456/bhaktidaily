'use strict';

const db = require('../config/db');
const { getDailyMessageQueue, JOB_NAMES } = require('../config/queues');
const logger = require('../utils/logger');

/**
 * BullMQ job processor: scans all users whose deliveryTime matches the
 * current IST hour:minute and enqueues a sendDailyMessage job for each.
 *
 * Runs every 5 minutes via a repeatable BullMQ job.
 * Built-in idempotency: sendDailyMessageJob checks whether a message was
 * already sent today before doing any work.
 */
async function processDailyScan(job) {
  // Current time in IST as HH:MM string
  const nowIST = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  logger.info({ message: 'dailyScanJob started', currentTimeIST: nowIST, jobId: job.id });

  // Find all fully-onboarded users whose delivery window matches now
  // We match on the HH:MM string stored in deliveryTime
  let usersToMessage;
  try {
    usersToMessage = await db.user.findMany({
      where: {
        isOnboarded: true,
        deliveryTime: nowIST,
      },
      select: { id: true, phone: true, deliveryTime: true, name: true },
    });
  } catch (err) {
    const msg = 'dailyScanJob: database query failed — is DATABASE_URL configured correctly?';
    logger.error({ message: msg, error: err.message });
    throw new Error(`${msg} (${err.message})`);
  }

  if (usersToMessage.length === 0) {
    logger.info({ message: 'dailyScanJob: no users to message at this time', nowIST });
    return { enqueued: 0 };
  }

  logger.info({
    message: 'dailyScanJob: enqueuing jobs',
    count: usersToMessage.length,
    nowIST,
  });

  const queue = getDailyMessageQueue();

  const enqueuedJobs = await Promise.all(
    usersToMessage.map((user) =>
      queue.add(
        JOB_NAMES.SEND_DAILY_MESSAGE,
        { userId: user.id },
        {
          // Deduplication key: one job per user per day prevents duplicates
          // if the scan fires twice in the same minute
          jobId: `daily-${user.id}-${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}`,
        }
      )
    )
  );

  logger.info({
    message: 'dailyScanJob: jobs enqueued',
    count: enqueuedJobs.filter(Boolean).length,
  });

  return { enqueued: enqueuedJobs.length };
}

module.exports = { processDailyScan };
