'use strict';

const db = require('../config/db');
const { getDayDeity, getRitu } = require('../services/calendarService');
const logger = require('../utils/logger');

/**
 * Seed the next 7 days of Hindu calendar events.
 * Creates day_deity and ritu events for each day.
 * Does NOT call any AI model — uses static DAY_DEITIES and getRitu() mappings.
 * Upserts to avoid duplicates on repeated runs.
 * @param {Object} job - BullMQ job
 * @returns {Promise<{ eventsSeeded: number }>}
 */
async function processCalendarSeed(job) {
  logger.info({ message: 'calendarSeedJob started', jobId: job.id });
  const startedAt = Date.now();
  let eventsSeeded = 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const dayDeity = getDayDeity(date);
    const ritu = getRitu(date);

    try {
      // Upsert day_deity event
      await db.hinduCalendarEvent.upsert({
        where: {
          date_eventType_name: {
            date,
            eventType: 'day_deity',
            name: dayDeity.name,
          },
        },
        update: {
          metadata: {
            deity: dayDeity.deity,
            theme: dayDeity.theme,
          },
        },
        create: {
          date,
          eventType: 'day_deity',
          name: dayDeity.name,
          metadata: {
            deity: dayDeity.deity,
            theme: dayDeity.theme,
          },
        },
      });
      eventsSeeded++;

      // Upsert ritu event
      await db.hinduCalendarEvent.upsert({
        where: {
          date_eventType_name: {
            date,
            eventType: 'ritu',
            name: ritu.name,
          },
        },
        update: {
          metadata: {
            english: ritu.english,
            description: ritu.description,
          },
        },
        create: {
          date,
          eventType: 'ritu',
          name: ritu.name,
          metadata: {
            english: ritu.english,
            description: ritu.description,
          },
        },
      });
      eventsSeeded++;
    } catch (err) {
      logger.error({ message: 'Failed to seed calendar event', date: date.toISOString(), error: err.message });
    }
  }

  const duration = Date.now() - startedAt;
  logger.info({ message: 'calendarSeedJob completed', jobId: job.id, eventsSeeded, durationMs: duration });

  return { eventsSeeded };
}

module.exports = { processCalendarSeed };
