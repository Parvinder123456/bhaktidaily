'use strict';

const { Worker } = require('bullmq');
const { createRedisConnection, getRedisClient } = require('../config/redis');
const {
  getDailyMessageQueue,
  getStreakCheckQueue,
  getBonusMessageQueue,
  getIntelligenceQueue,
  JOB_NAMES,
  DEFAULT_JOB_OPTIONS,
} = require('../config/queues');
const { processSendDailyMessage } = require('./sendDailyMessageJob');
const { processDailyScan } = require('./dailyScanJob');
const { processStreakCheck } = require('./streakCheckJob');
const { processBonusMessage } = require('./bonusMessageJob');
const { processBonusScan } = require('./bonusScanJob');
// Intelligence / self-improvement jobs
const { processContentGeneration } = require('./contentGenerationJob');
const { processCalendarSeed } = require('./calendarSeedJob');
const { processEngagementUpdate } = require('./engagementUpdateJob');
const { processVariantRotation } = require('./variantRotationJob');
const { processWeeklyTheme } = require('./weeklyThemeJob');
const { processInsightReport } = require('./insightReportJob');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Worker instances (module-level so they can be cleanly shut down)
// ---------------------------------------------------------------------------
let dailyMessageWorker = null;
let streakCheckWorker = null;
let bonusMessageWorker = null;
let intelligenceWorker = null;

// ---------------------------------------------------------------------------
// Gemini RPM budget allocation
// GEMINI_RPM env var sets the total requests-per-minute cap (default: 10 for free tier).
// Reserve 4 RPM for on-demand chat; split the rest between daily and bonus workers.
// ---------------------------------------------------------------------------
function buildGeminiLimiters() {
  const totalRpm = parseInt(process.env.GEMINI_RPM || '10', 10);
  const reservedForChat = Math.min(4, Math.floor(totalRpm * 0.4));
  const available = totalRpm - reservedForChat;
  const dailyMax = Math.max(1, Math.floor(available * 0.67));
  const bonusMax = Math.max(1, available - dailyMax);

  logger.info({
    message: 'Gemini RPM budget',
    totalRpm,
    reservedForChat,
    dailyWorkerMax: dailyMax,
    bonusWorkerMax: bonusMax,
  });

  return {
    daily: { max: dailyMax, duration: 60_000 },
    bonus: { max: bonusMax, duration: 60_000 },
  };
}

/**
 * Starts all BullMQ workers and registers the repeatable scan jobs.
 * Safe to call multiple times — guards against double-initialisation.
 */
async function startWorkers() {
  if (dailyMessageWorker || intelligenceWorker) {
    logger.warn({ message: 'BullMQ workers already started — skipping' });
    return;
  }

  // Ensure Redis is alive before registering anything
  const redis = getRedisClient();
  await redis.ping();

  const limiters = buildGeminiLimiters();

  // ---- Worker: dailyMessageQueue ----------------------------------------
  // Handles both the periodic scan job AND the per-user send job
  dailyMessageWorker = new Worker(
    'dailyMessageQueue',
    async (job) => {
      if (job.name === JOB_NAMES.SEND_DAILY_MESSAGE) {
        return processSendDailyMessage(job);
      }
      if (job.name === JOB_NAMES.DAILY_SCAN) {
        return processDailyScan(job);
      }
      logger.warn({ message: 'dailyMessageWorker: unknown job name', jobName: job.name });
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
      limiter: limiters.daily,
    }
  );

  dailyMessageWorker.on('completed', (job, result) => {
    logger.info({ message: 'Job completed', queue: 'dailyMessageQueue', jobId: job.id, jobName: job.name, result });
  });

  dailyMessageWorker.on('failed', (job, err) => {
    logger.error({ message: 'Job failed', queue: 'dailyMessageQueue', jobId: job?.id, jobName: job?.name, error: err.message });
  });

  // ---- Worker: streakCheckQueue ------------------------------------------
  streakCheckWorker = new Worker(
    'streakCheckQueue',
    async (job) => {
      if (job.name === JOB_NAMES.STREAK_CHECK) {
        return processStreakCheck(job);
      }
      logger.warn({ message: 'streakCheckWorker: unknown job name', jobName: job.name });
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    }
  );

  streakCheckWorker.on('completed', (job, result) => {
    logger.info({ message: 'Job completed', queue: 'streakCheckQueue', jobId: job.id, result });
  });

  streakCheckWorker.on('failed', (job, err) => {
    logger.error({ message: 'Job failed', queue: 'streakCheckQueue', jobId: job?.id, error: err.message });
  });

  // ---- Worker: bonusMessageQueue ----------------------------------------
  bonusMessageWorker = new Worker(
    'bonusMessageQueue',
    async (job) => {
      if (job.name === JOB_NAMES.SEND_BONUS_MESSAGE) {
        return processBonusMessage(job);
      }
      if (job.name === JOB_NAMES.BONUS_SCAN) {
        return processBonusScan(job);
      }
      logger.warn({ message: 'bonusMessageWorker: unknown job name', jobName: job.name });
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
      limiter: limiters.bonus,
    }
  );

  bonusMessageWorker.on('completed', (job, result) => {
    logger.info({ message: 'Job completed', queue: 'bonusMessageQueue', jobId: job.id, jobName: job.name, result });
  });

  bonusMessageWorker.on('failed', (job, err) => {
    logger.error({ message: 'Job failed', queue: 'bonusMessageQueue', jobId: job?.id, jobName: job?.name, error: err.message });
  });

  // ---- Worker: intelligenceQueue -----------------------------------------
  // Handles all weekly self-improvement jobs (content gen, insight reports, etc.)
  intelligenceWorker = new Worker(
    'intelligenceQueue',
    async (job) => {
      switch (job.name) {
        case JOB_NAMES.CONTENT_GENERATION:
          return processContentGeneration(job);
        case JOB_NAMES.CALENDAR_SEED:
          return processCalendarSeed(job);
        case JOB_NAMES.ENGAGEMENT_PROFILE_UPDATE:
          return processEngagementUpdate(job);
        case JOB_NAMES.VARIANT_ROTATION:
          return processVariantRotation(job);
        case JOB_NAMES.WEEKLY_THEME:
          return processWeeklyTheme(job);
        case JOB_NAMES.INSIGHT_REPORT:
          return processInsightReport(job);
        default:
          logger.warn({ message: 'intelligenceWorker: unknown job name', jobName: job.name });
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // run intelligence jobs one at a time to avoid Gemini Pro rate limits
    }
  );

  intelligenceWorker.on('completed', (job, result) => {
    logger.info({ message: 'Job completed', queue: 'intelligenceQueue', jobId: job.id, jobName: job.name, result });
  });

  intelligenceWorker.on('failed', (job, err) => {
    logger.error({ message: 'Job failed', queue: 'intelligenceQueue', jobId: job?.id, jobName: job?.name, error: err.message });
  });

  // ---- Register repeatable jobs ------------------------------------------
  await registerRepeatableJobs();

  logger.info({ message: 'BullMQ workers started (daily, streak, bonus, intelligence)' });
}

/**
 * Registers the repeatable (cron-style) jobs.
 * Each job is idempotent — BullMQ deduplicates by name + cron pattern.
 */
async function registerRepeatableJobs() {
  const dailyQueue = getDailyMessageQueue();
  const streakQueue = getStreakCheckQueue();
  const bonusQueue = getBonusMessageQueue();
  const intelligenceQueue = getIntelligenceQueue();

  // Daily scan: runs every 5 minutes
  await dailyQueue.add(
    JOB_NAMES.DAILY_SCAN,
    {},
    {
      repeat: { every: 5 * 60 * 1000 }, // 5 minutes in ms
      jobId: 'daily-scan-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Streak check: runs daily at midnight IST (19:30 UTC previous day)
  await streakQueue.add(
    JOB_NAMES.STREAK_CHECK,
    {},
    {
      repeat: { cron: '30 19 * * *', tz: 'Asia/Kolkata' },
      jobId: 'streak-check-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // ---- Bonus message scans ----

  // Monday trivia question: 12:00 PM IST (6:30 UTC)
  await bonusQueue.add(
    JOB_NAMES.BONUS_SCAN,
    { scanType: 'trivia_question' },
    {
      repeat: { cron: '30 6 * * 1', tz: 'Asia/Kolkata' },
      jobId: 'bonus-scan-trivia-question',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Monday trivia answer reveal: 6:00 PM IST (12:30 UTC)
  await bonusQueue.add(
    JOB_NAMES.BONUS_SCAN,
    { scanType: 'trivia_answer' },
    {
      repeat: { cron: '30 12 * * 1', tz: 'Asia/Kolkata' },
      jobId: 'bonus-scan-trivia-answer',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Tue-Sun morning bonus: 8:00 AM IST (2:30 UTC)
  await bonusQueue.add(
    JOB_NAMES.BONUS_SCAN,
    { scanType: 'morning' },
    {
      repeat: { cron: '30 2 * * 0,2,3,4,5,6', tz: 'Asia/Kolkata' },
      jobId: 'bonus-scan-morning',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // ---- Intelligence queue: self-improvement jobs --------------------------

  // Content generation: Sunday 11 PM IST — generates trivia, facts, chaupais for the week
  await intelligenceQueue.add(
    JOB_NAMES.CONTENT_GENERATION,
    {},
    {
      repeat: { cron: '0 23 * * 0', tz: 'Asia/Kolkata' },
      jobId: 'content-generation-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Calendar seed: Sunday 10 PM IST — seeds next 7 days of Hindu calendar events
  await intelligenceQueue.add(
    JOB_NAMES.CALENDAR_SEED,
    {},
    {
      repeat: { cron: '0 22 * * 0', tz: 'Asia/Kolkata' },
      jobId: 'calendar-seed-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Engagement profile update: daily 3 AM IST — recalculates tiers for all users
  await intelligenceQueue.add(
    JOB_NAMES.ENGAGEMENT_PROFILE_UPDATE,
    {},
    {
      repeat: { cron: '0 3 * * *', tz: 'Asia/Kolkata' },
      jobId: 'engagement-profile-update-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Variant rotation: Monday 5 AM IST — evaluates A/B test results and shifts users
  await intelligenceQueue.add(
    JOB_NAMES.VARIANT_ROTATION,
    {},
    {
      repeat: { cron: '0 5 * * 1', tz: 'Asia/Kolkata' },
      jobId: 'variant-rotation-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Weekly theme: Sunday 11:30 PM IST — assigns next theme in 12-week cycle
  await intelligenceQueue.add(
    JOB_NAMES.WEEKLY_THEME,
    {},
    {
      repeat: { cron: '30 23 * * 0', tz: 'Asia/Kolkata' },
      jobId: 'weekly-theme-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  // Insight report: Monday 6 AM IST — weekly AI product intelligence analysis
  await intelligenceQueue.add(
    JOB_NAMES.INSIGHT_REPORT,
    {},
    {
      repeat: { cron: '0 6 * * 1', tz: 'Asia/Kolkata' },
      jobId: 'insight-report-repeatable',
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
    }
  );

  logger.info({
    message: 'Repeatable jobs registered: dailyScan (5 min), streakCheck (midnight IST), bonusScan, contentGeneration (Sun 11PM), calendarSeed (Sun 10PM), engagementUpdate (daily 3AM), variantRotation (Mon 5AM), weeklyTheme (Sun 11:30PM), insightReport (Mon 6AM)',
  });
}

/**
 * Gracefully closes all workers.
 */
async function stopWorkers() {
  if (dailyMessageWorker) await dailyMessageWorker.close();
  if (streakCheckWorker) await streakCheckWorker.close();
  if (bonusMessageWorker) await bonusMessageWorker.close();
  if (intelligenceWorker) await intelligenceWorker.close();
  logger.info({ message: 'BullMQ workers stopped' });
}

module.exports = { startWorkers, stopWorkers };
