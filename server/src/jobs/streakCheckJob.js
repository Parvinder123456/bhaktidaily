'use strict';

const streakService = require('../services/streakService');
const logger = require('../utils/logger');

/**
 * BullMQ job processor: nightly streak reset scan.
 *
 * Scheduled to run once daily at midnight IST via a BullMQ repeatable job.
 * Delegates to streakService.checkAndResetStreaks() for all business logic.
 */
async function processStreakCheck(job) {
  logger.info({ message: 'streakCheckJob started', jobId: job.id });

  const resetCount = await streakService.checkAndResetStreaks();

  logger.info({ message: 'streakCheckJob completed', resetCount });
  return { resetCount };
}

module.exports = { processStreakCheck };
