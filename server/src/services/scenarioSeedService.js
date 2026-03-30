'use strict';

const crypto = require('crypto');
const seeds = require('../data/scenarioSeeds.json');

/**
 * Scenario Seed Service
 *
 * Injects a user-specific "micro-scenario" into the daily prompt.
 * This forces Gemini out of its house style and grounds the raashifal
 * in a specific life situation — making the message feel eerily relevant.
 *
 * The seed is deterministic per userId + date, so:
 *   - Same user gets the same scenario on the same day (consistent re-sends)
 *   - Different users get different scenarios (personalised feel)
 *   - The scenario changes every day (freshness)
 */

/**
 * Get a deterministic scenario seed for a user on a given date.
 * Uses MD5 hash of userId + dateStr to select from the seed pool.
 * @param {string} userId - User UUID
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} Scenario description
 */
function getScenarioSeed(userId, dateStr) {
  const hash = crypto.createHash('md5').update(userId + dateStr).digest('hex');
  const index = parseInt(hash.slice(0, 8), 16) % seeds.length;
  return seeds[index];
}

/**
 * Get the prompt injection text for a scenario seed.
 * Wraps the seed with the instruction that tells Gemini how to use it.
 * @param {string} seed - The scenario string
 * @returns {string} Full injection text for the prompt
 */
function getScenarioInjection(seed) {
  return `Imagine this user's situation today: "${seed}". Let this subtly color the raashifal and sandesh — but do NOT mention the scenario explicitly. It should feel eerily relevant to their life, not stated outright.`;
}

/**
 * Get all seeds (used for pool statistics and testing).
 * @returns {string[]}
 */
function getAllSeeds() {
  return seeds;
}

module.exports = { getScenarioSeed, getScenarioInjection, getAllSeeds };
