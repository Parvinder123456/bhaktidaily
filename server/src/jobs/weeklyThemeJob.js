'use strict';

const db = require('../config/db');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// 12-Week Narrative Cycle — embedded constant
// ---------------------------------------------------------------------------

const TWELVE_WEEK_CYCLE = [
  {
    week: 1,
    themeSanskrit: 'Shraddha',
    themeEnglish: 'Faith',
    teaching: 'Vishwas rakhna seekho — apne aap par, Bhagwan par, aur waqt par. Bina proof ke jo believe kar sake, wohi asli Shraddha hai.',
  },
  {
    week: 2,
    themeSanskrit: 'Karma',
    themeEnglish: 'Action',
    teaching: 'Karm karo, phal ki chinta mat karo. Bhagavad Gita ka sabse bada sandesh: aaj ka karm hi kal ki kismat banata hai.',
  },
  {
    week: 3,
    themeSanskrit: 'Shakti',
    themeEnglish: 'Inner Strength',
    teaching: 'Tumhare andar woh shakti hai jo tumhara dushman bhi nahi jaanta. Aaj use pehchano — mushkil mein hi asli taaqat dikhti hai.',
  },
  {
    week: 4,
    themeSanskrit: 'Dhairya',
    themeEnglish: 'Patience',
    teaching: 'Sabr ka phal meetha hota hai. Jo ruk sakta hai, woh jeet sakta hai. Nature ka niyam hai — beej se ped banne mein time lagta hai.',
  },
  {
    week: 5,
    themeSanskrit: 'Bhakti',
    themeEnglish: 'Devotion',
    teaching: 'Bhakti sirf mandir mein nahi hoti — jab tum kisi cheez mein apna poora dil lagaate ho, woh bhi Bhakti hai.',
  },
  {
    week: 6,
    themeSanskrit: 'Viveka',
    themeEnglish: 'Discernment',
    teaching: 'Sahi aur galat mein fark karna — yeh sabse mushkil aur sabse zaroori kaam hai. Viveka woh noor hai jo andheron mein raasta dikhata hai.',
  },
  {
    week: 7,
    themeSanskrit: 'Seva',
    themeEnglish: 'Selfless Service',
    teaching: 'Jab tum dusron ke liye jeete ho, tab zindagi ka matlab samajh mein aata hai. Seva mein koi "main" nahi hota — sirf karm hota hai.',
  },
  {
    week: 8,
    themeSanskrit: 'Vairagya',
    themeEnglish: 'Detachment',
    teaching: 'Chhod dena seekho — not giving up, but letting go. Jo cheez tumhari nahi hai, usse thame rehna hi dukh ka kaaran hai.',
  },
  {
    week: 9,
    themeSanskrit: 'Satya',
    themeEnglish: 'Truth',
    teaching: 'Sachhai se bada koi dharm nahi — apne aap se bhi, dusron se bhi. Satya akela hai jo waqt ke saath aur mazboot hota hai.',
  },
  {
    week: 10,
    themeSanskrit: 'Kshama',
    themeEnglish: 'Forgiveness',
    teaching: 'Maaf karna kamzori nahi — sabse badi taaqat hai. Jo maaf kar sakta hai, woh khud azaad hota hai — dusron ke liye nahi, apne liye.',
  },
  {
    week: 11,
    themeSanskrit: 'Ananda',
    themeEnglish: 'Joy',
    teaching: 'Anand bahar se nahi milta — woh andar se fauta hai. Chhoti chhoti khushiyaan hi asli Ananda hain — unhe pehchano aaj.',
  },
  {
    week: 12,
    themeSanskrit: 'Moksha',
    themeEnglish: 'Liberation',
    teaching: 'Sabse badi azaadi woh hai jab tum apni hi sochon ke qaaid nahi rehte. Moksha marne ke baad nahi — sochne ke dhang badalne se milta hai.',
  },
];

// ---------------------------------------------------------------------------
// Arc beat system (4-beat narrative arc within each week)
// ---------------------------------------------------------------------------

const ARC_BEATS = [
  { day: 0, beat: 'resolve', instruction: 'Sunday: bring the week\'s theme to a peaceful resolution. Summarise the journey, acknowledge the user\'s growth, and give a sense of completion before the new week.' },
  { day: 1, beat: 'introduce', instruction: 'Monday: introduce this week\'s Sanskrit theme for the first time. Name it, explain what it means in modern life, and create curiosity about the week ahead.' },
  { day: 2, beat: 'introduce', instruction: 'Tuesday: deepen the introduction. Give an example from Hindu scripture or mythology that illustrates this week\'s theme.' },
  { day: 3, beat: 'explore', instruction: 'Wednesday: explore the theme through a real-life challenge. How does this theme show up when life gets hard? What would a wise person do?' },
  { day: 4, beat: 'explore', instruction: 'Thursday: explore the theme through a different angle — practical, everyday application. Give one specific action the user can take today.' },
  { day: 5, beat: 'challenge', instruction: 'Friday: challenge the user with this theme. Ask a difficult question or present a hard truth. Don\'t be easy — growth requires discomfort.' },
  { day: 6, beat: 'challenge', instruction: 'Saturday: present the deepest expression of this theme. Reference a master — Krishna, Ram, Hanuman, or a great saint — and how they embodied it.' },
];

// ---------------------------------------------------------------------------
// Utility: get current week number (ISO-like, but Sunday-based for IST)
// ---------------------------------------------------------------------------

/**
 * Get absolute week number since epoch (Sunday-based).
 * @param {Date} date
 * @returns {number}
 */
function getAbsoluteWeekNumber(date) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor(date.getTime() / msPerWeek);
}

// ---------------------------------------------------------------------------
// Exported utility
// ---------------------------------------------------------------------------

/**
 * Get the 4-beat arc instruction for a given day of week.
 * Mon-Tue: introduce, Wed-Thu: explore, Fri-Sat: challenge, Sun: resolve.
 * @param {number} dayOfWeek - 0=Sun, 1=Mon, ..., 6=Sat
 * @returns {{ beat: string, instruction: string }}
 */
function getArcBeat(dayOfWeek) {
  return ARC_BEATS[dayOfWeek] || ARC_BEATS[0];
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Weekly theme assignment job.
 * Assigns the next theme in the 12-week cycle to every onboarded user.
 * @param {Object} job - BullMQ job
 * @returns {Promise<{ usersAssigned: number, weekNumber: number, theme: string }>}
 */
async function processWeeklyTheme(job) {
  logger.info({ message: 'weeklyThemeJob started', jobId: job.id });
  const startedAt = Date.now();

  const now = new Date();
  const weekNumber = getAbsoluteWeekNumber(now);

  // Calculate next Sunday midnight IST as the theme start
  const nextSunday = new Date(now);
  nextSunday.setUTCHours(18, 30, 0, 0); // midnight IST (UTC+5:30 = UTC 18:30 prev day)
  // Adjust to next Sunday
  const daysToSunday = (7 - now.getDay()) % 7 || 7;
  nextSunday.setDate(nextSunday.getDate() + daysToSunday);

  let usersAssigned = 0;
  const BATCH_SIZE = 50;
  let cursor = null;

  while (true) {
    const query = {
      where: { isOnboarded: true },
      select: { id: true, contentCycleWeek: true },
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

    await Promise.allSettled(
      batch.map(async (user) => {
        try {
          // Determine next cycle week (1-12, wraps at 13 back to 1)
          const currentCycleWeek = user.contentCycleWeek || 0;
          const nextCycleWeek = (currentCycleWeek % 12) + 1;
          const cycle = Math.floor(currentCycleWeek / 12) + 1;

          const themeData = TWELVE_WEEK_CYCLE[nextCycleWeek - 1];

          // Create WeeklyTheme record
          await db.weeklyTheme.create({
            data: {
              userId: user.id,
              weekNumber,
              cycleWeek: nextCycleWeek,
              cycle,
              themeSanskrit: themeData.themeSanskrit,
              themeEnglish: themeData.themeEnglish,
              teaching: themeData.teaching,
              startsAt: nextSunday,
            },
          });

          // Increment contentCycleWeek on user
          await db.user.update({
            where: { id: user.id },
            data: { contentCycleWeek: currentCycleWeek + 1 },
          });

          usersAssigned++;
        } catch (err) {
          logger.error({ message: 'Failed to assign weekly theme', userId: user.id, error: err.message });
        }
      })
    );
  }

  const duration = Date.now() - startedAt;
  const cycleInfo = TWELVE_WEEK_CYCLE[0]; // placeholder — actual week varies per user

  logger.info({
    message: 'weeklyThemeJob completed',
    jobId: job.id,
    weekNumber,
    usersAssigned,
    durationMs: duration,
  });

  return { usersAssigned, weekNumber, theme: cycleInfo.themeSanskrit };
}

module.exports = { processWeeklyTheme, getArcBeat, TWELVE_WEEK_CYCLE };
