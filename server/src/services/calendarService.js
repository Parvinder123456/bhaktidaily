'use strict';

const db = require('../config/db');

// ---------------------------------------------------------------------------
// Static mappings
// ---------------------------------------------------------------------------

// Day-of-week deity mapping (0=Sunday, 1=Monday, ..., 6=Saturday)
const DAY_DEITIES = [
  { deity: 'Surya Dev', theme: 'power, vitality, and success', name: 'Ravivar — Surya Puja' },
  { deity: 'Shiv Ji', theme: 'devotion, Somvar vrat, and new beginnings', name: 'Somvar — Shiv Puja' },
  { deity: 'Hanuman Ji & Mangal Dev', theme: 'strength, courage, and removing obstacles', name: 'Mangalvar — Hanuman Puja' },
  { deity: 'Vishnu Ji & Budh Dev', theme: 'wisdom, communication, and business', name: 'Budhvar — Vishnu Puja' },
  { deity: 'Brihaspati Dev (Guru)', theme: 'learning, prosperity, and teachers', name: 'Guruvar — Brihaspati Puja' },
  { deity: 'Devi Lakshmi & Shukra Dev', theme: 'wealth, beauty, and relationships', name: 'Shukravar — Lakshmi Puja' },
  { deity: 'Shani Dev', theme: 'karma, discipline, and justice', name: 'Shanivar — Shani Puja' },
];

// Ritu (season) mapping by month (1-indexed, approximate Hindu calendar)
const RITU_BY_MONTH = {
  1: { name: 'Shishir', english: 'Late Winter', description: 'season of stillness and inner reflection' },
  2: { name: 'Shishir', english: 'Late Winter', description: 'season of stillness and inner reflection' },
  3: { name: 'Vasanta', english: 'Spring', description: 'season of renewal, new beginnings, and Holi' },
  4: { name: 'Vasanta', english: 'Spring', description: 'season of renewal, new beginnings, and Ram Navami' },
  5: { name: 'Grishma', english: 'Summer', description: 'season of heat, endurance, and purification' },
  6: { name: 'Grishma', english: 'Summer', description: 'season of heat, endurance, and purification' },
  7: { name: 'Varsha', english: 'Monsoon', description: 'season of abundance, fertility, and Sawan' },
  8: { name: 'Varsha', english: 'Monsoon', description: 'season of abundance, Janmashtami, and devotion' },
  9: { name: 'Sharad', english: 'Autumn', description: 'season of clarity, harvest, and Navratri' },
  10: { name: 'Sharad', english: 'Autumn', description: 'season of clarity, Diwali, and celebration' },
  11: { name: 'Hemant', english: 'Early Winter', description: 'season of drawing inward and gratitude' },
  12: { name: 'Hemant', english: 'Early Winter', description: 'season of drawing inward and new resolutions' },
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all calendar events for a given date.
 * @param {Date} date
 * @returns {Promise<Array>} HinduCalendarEvent records
 */
async function getEventsForDate(date) {
  // Normalise to date-only for comparison
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  return db.hinduCalendarEvent.findMany({
    where: { date: dayStart },
    orderBy: { eventType: 'asc' },
  });
}

/**
 * Get the ritu (season) for a given date.
 * @param {Date} date
 * @returns {{ name: string, english: string, description: string }}
 */
function getRitu(date) {
  const month = date.getMonth() + 1; // 1-indexed
  return RITU_BY_MONTH[month] || RITU_BY_MONTH[1];
}

/**
 * Get the day deity entry for a given date.
 * @param {Date} date
 * @returns {{ deity: string, theme: string, name: string }}
 */
function getDayDeity(date) {
  return DAY_DEITIES[date.getDay()];
}

/**
 * Build a prompt injection string from today's calendar events.
 * Used to inject Hindu calendar context into the daily message prompt.
 * @param {Date} date
 * @returns {Promise<string>} Multi-line text for prompt injection
 */
async function getCalendarContext(date) {
  const events = await getEventsForDate(date);
  const dayDeity = getDayDeity(date);
  const ritu = getRitu(date);

  const lines = [
    `Day: ${dayDeity.name} — deity of the day is ${dayDeity.deity} (${dayDeity.theme})`,
    `Season: ${ritu.name} (${ritu.english}) — ${ritu.description}`,
  ];

  // Add special events (ekadashi, purnima, festivals etc.) from DB
  const specialEvents = events.filter(e => e.eventType !== 'day_deity' && e.eventType !== 'ritu');
  for (const event of specialEvents) {
    const meta = event.metadata || {};
    const desc = meta.description ? ` — ${meta.description}` : '';
    lines.push(`Special: ${event.name}${desc}`);
  }

  return lines.join('\n');
}

module.exports = {
  getEventsForDate,
  getRitu,
  getDayDeity,
  getCalendarContext,
  DAY_DEITIES,
  RITU_BY_MONTH,
};
