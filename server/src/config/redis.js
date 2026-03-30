'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Returns a singleton ioredis connection.
 * The connection is created lazily on first access and reused.
 */
function getRedisClient() {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
    lazyConnect: true,          // Don't crash at startup if Redis is unreachable
    retryStrategy: (times) => {
      if (times > 3) return null; // stop retrying after 3 attempts
      return Math.min(times * 500, 2000);
    },
  });

  redisClient.on('connect', () => {
    logger.info({ message: 'Redis connected', url: url.replace(/:\/\/.*@/, '://***@') });
  });

  redisClient.on('error', (err) => {
    logger.error({ message: 'Redis connection error', error: err.message });
  });

  redisClient.on('close', () => {
    logger.warn({ message: 'Redis connection closed' });
  });

  return redisClient;
}

/**
 * Returns a fresh ioredis connection for use as a BullMQ connection option.
 * BullMQ requires separate connection instances for Worker vs Queue.
 */
function createRedisConnection() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 500, 2000);
    },
  });
}

module.exports = { getRedisClient, createRedisConnection };
