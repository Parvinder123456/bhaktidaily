'use strict';

/**
 * Raashifal Lens Rotation Service
 *
 * Cycles through 6 distinct "lenses" that force Gemini to generate
 * specific, varied raashifal content instead of generic encouragement.
 * The lens rotates deterministically by day of year — same date always
 * returns the same lens, ensuring all users get the same theme daily.
 */

const LENSES = [
  {
    key: 'practical',
    label: 'Practical (Career & Money)',
    inject: 'Focus on career, money decisions, and time management. Mention specific actions: "sign that document", "avoid lending money today", "deadline mat talo". Reference rahu kaal timing for important decisions.',
  },
  {
    key: 'emotional',
    label: 'Emotional (Relationships)',
    inject: 'Focus on relationships — spouse, parents, children, friends. Mention a specific relational dynamic: "resolve that old argument", "call your mother today", "ek insaan ko maafi do". Make it feel personal.',
  },
  {
    key: 'karmic',
    label: 'Karmic (Karma & Planets)',
    inject: 'Frame the day through karma and past-life patterns. Reference Shani, Rahu effects. Mention what past actions are bearing fruit today. Use terms like "pichle janm ka hisaab", "Shani ki drishti".',
  },
  {
    key: 'health',
    label: 'Health (Body & Mind)',
    inject: 'Focus on physical and mental health. Mention specific advice: "avoid heavy food after 2 PM", "evening walk will clear confusion", "sleep early tonight", "paani zyada piyo aaj". Be concrete.',
  },
  {
    key: 'wealth',
    label: 'Wealth (Dhan & Finance)',
    inject: 'Focus on dhan and financial decisions. Be specific: "investment ka faisla aaj mat lo", "unexpected expense aa sakta hai", "savings shuru karo aaj se", "kisi ko bina soche paise mat do".',
  },
  {
    key: 'spiritual',
    label: 'Spiritual (Sadhana & Growth)',
    inject: 'Focus on sadhana and inner growth. Mention specific practices: "do 11 minutes of japa today", "visit mandir in the evening", "donate something small today", "moun rakhna shubh hai aaj". Ground it in action.',
  },
];

/**
 * Get today's raashifal lens based on day of year.
 * Cycles through all 6 lenses deterministically.
 * @param {Date} date
 * @returns {{ key: string, label: string, inject: string }}
 */
function getLensForDate(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - startOfYear) / 86_400_000);
  return LENSES[dayOfYear % LENSES.length];
}

/**
 * Get the full lens index (for dashboard display or seeding).
 * @returns {Array} All 6 lenses
 */
function getAllLenses() {
  return LENSES;
}

module.exports = { getLensForDate, getAllLenses, LENSES };
