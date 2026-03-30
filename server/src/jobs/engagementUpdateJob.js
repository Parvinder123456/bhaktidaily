'use strict';

const db = require('../config/db');
const { updateEngagementProfile } = require('../services/engagementService');
const logger = require('../utils/logger');

/**
 * Batch-update engagement profiles for all onboarded users.
 * Runs daily at 3 AM IST. Processes users in batches to avoid memory issues.
 * @param {Object} job - BullMQ job
 * @returns {Promise<{ usersUpdated: number, errors: number }>}
 */
async function processEngagementUpdate(job) {
  logger.info({ message: 'engagementUpdateJob started', jobId: job.id });
  const startedAt = Date.now();

  const BATCH_SIZE = 50;
  let cursor = null;
  let usersUpdated = 0;
  let errors = 0;

  // Process all onboarded users in cursor-based batches
  while (true) {
    const query = {
      where: { isOnboarded: true },
      select: { id: true },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    };

    if (cursor) {
      query.skip = 1;
      query.cursor = { id: cursor };
    }

    const batch = await db.user.findMany(query);
    if (batch.length === 0) break;

    cursor = batch[batch.length - 1].id;

    // Process each user in the batch
    await Promise.allSettled(
      batch.map(async ({ id }) => {
        try {
          await updateEngagementProfile(id);
          usersUpdated++;
        } catch (err) {
          errors++;
          logger.error({ message: 'Failed to update engagement profile', userId: id, error: err.message });
        }
      })
    );

    // Report progress on each batch
    if (job.updateProgress) {
      await job.updateProgress({ usersUpdated, errors });
    }
  }

  const duration = Date.now() - startedAt;
  logger.info({
    message: 'engagementUpdateJob completed',
    jobId: job.id,
    usersUpdated,
    errors,
    durationMs: duration,
  });

  return { usersUpdated, errors };
}

module.exports = { processEngagementUpdate };
