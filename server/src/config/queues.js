'use strict';

const { Queue } = require('bullmq');
const { createRedisConnection } = require('./redis');
const logger = require('../utils/logger');

// Job names — exported so processors can reference the same constants
const JOB_NAMES = {
  SEND_DAILY_MESSAGE: 'sendDailyMessage',
  DAILY_SCAN: 'dailyScan',
  STREAK_CHECK: 'streakCheck',
  SEND_BONUS_MESSAGE: 'sendBonusMessage',
  BONUS_SCAN: 'bonusScan',
  // Intelligence / self-improvement jobs
  CONTENT_GENERATION: 'contentGeneration',
  CALENDAR_SEED: 'calendarSeed',
  ENGAGEMENT_PROFILE_UPDATE: 'engagementProfileUpdate',
  VARIANT_ROTATION: 'variantRotation',
  WEEKLY_THEME: 'weeklyTheme',
  INSIGHT_REPORT: 'insightReport',
};

// Default job options applied to every enqueued job
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5 s initial delay; doubles each retry
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

let dailyMessageQueue = null;
let streakCheckQueue = null;
let bonusMessageQueue = null;
let intelligenceQueue = null;

/**
 * Returns the singleton dailyMessageQueue, creating it on first call.
 */
function getDailyMessageQueue() {
  if (!dailyMessageQueue) {
    dailyMessageQueue = new Queue('dailyMessageQueue', {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    logger.info({ message: 'dailyMessageQueue initialised' });
  }
  return dailyMessageQueue;
}

/**
 * Returns the singleton streakCheckQueue, creating it on first call.
 */
function getStreakCheckQueue() {
  if (!streakCheckQueue) {
    streakCheckQueue = new Queue('streakCheckQueue', {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    logger.info({ message: 'streakCheckQueue initialised' });
  }
  return streakCheckQueue;
}

/**
 * Returns the singleton bonusMessageQueue, creating it on first call.
 */
function getBonusMessageQueue() {
  if (!bonusMessageQueue) {
    bonusMessageQueue = new Queue('bonusMessageQueue', {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    logger.info({ message: 'bonusMessageQueue initialised' });
  }
  return bonusMessageQueue;
}

/**
 * Returns the singleton intelligenceQueue, creating it on first call.
 * Used for weekly AI jobs: content generation, calendar seed, insight reports,
 * variant rotation, engagement profile updates, weekly themes.
 */
function getIntelligenceQueue() {
  if (!intelligenceQueue) {
    intelligenceQueue = new Queue('intelligenceQueue', {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    logger.info({ message: 'intelligenceQueue initialised' });
  }
  return intelligenceQueue;
}

module.exports = {
  getDailyMessageQueue,
  getStreakCheckQueue,
  getBonusMessageQueue,
  getIntelligenceQueue,
  JOB_NAMES,
  DEFAULT_JOB_OPTIONS,
};
