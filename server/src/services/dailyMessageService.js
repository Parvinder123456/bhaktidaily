'use strict';

const scriptureService = require('./scriptureService');
const panchangService = require('./panchangService');
const aiService = require('./aiService');
const promptService = require('./promptService');
const contentLogService = require('./contentLogService');
const raashifalLensService = require('./raashifalLensService');
const scenarioSeedService = require('./scenarioSeedService');
const calendarService = require('./calendarService');
const engagementService = require('./engagementService');
const variantService = require('./variantService');
const logger = require('../utils/logger');

// Theme tags to randomly select from
const THEME_TAGS = [
  'karma', 'dharma', 'devotion', 'strength', 'detachment',
  'equanimity', 'peace', 'faith', 'courage', 'surrender',
  'self-knowledge', 'truth', 'compassion', 'gratitude', 'prosperity',
];

/**
 * Generates a complete daily message for a user with the new 5-segment format.
 *
 * @param {object} user - Full user record from DB
 * @returns {Promise<{ horoscope: string, verse: object, challenge: string, fullText: string }>}
 */
async function generateDailyMessage(user) {
  // 1. Pick a random theme tag
  const tag = THEME_TAGS[Math.floor(Math.random() * THEME_TAGS.length)];
  logger.info({ message: 'Generating daily message v2', userId: user.id, tag });

  // 2. Get a history-aware verse (user hasn't seen in 60 days)
  let verse = await scriptureService.getVerseForUser(user.id);
  // Fallback: tag-based selection if getVerseForUser returns null unexpectedly
  if (!verse) {
    verse = await scriptureService.getVerseByTag(tag);
  }
  if (!verse) {
    verse = await scriptureService.getRandomVerse();
  }

  // 3. Get today's panchang data
  const panchang = panchangService.getTodayPanchang();

  // 4. Get today's raashifal lens and scenario seed
  const now = new Date();
  const lens = raashifalLensService.getLensForDate(now);
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD in IST
  const scenarioSeed = scenarioSeedService.getScenarioSeed(user.id, dateStr);

  logger.info({ message: 'Daily message lens + seed selected', userId: user.id, lens: lens.key, dateStr });

  // 4b. Get Hindu calendar context (non-fatal — defaults to empty string)
  let calendarContext = '';
  try {
    calendarContext = await calendarService.getCalendarContext(now);
  } catch (err) {
    logger.warn({ message: 'calendarService unavailable, skipping', error: err.message });
  }

  // 4c. Get tone injection based on engagement tier (non-fatal)
  let toneInstruction = '';
  try {
    toneInstruction = engagementService.getToneInjection(user.engagementProfile);
  } catch (err) {
    logger.warn({ message: 'engagementService unavailable, skipping', error: err.message });
  }

  // 4d. Get A/B variant prompt style for bhagwan_sandesh (non-fatal)
  let variantStyle = 'default';
  let variantPromptInstruction = '';
  try {
    const variantId = await variantService.assignVariant(user.id, 'bhagwan_sandesh');
    if (variantId) {
      const variantPrompt = await variantService.getVariantPrompt(variantId);
      if (variantPrompt) {
        variantPromptInstruction = variantPrompt.replace(/{name}/g, user.name || 'Bhakt');
        variantStyle = (await variantService.getUserVariantStyle(user.id, 'bhagwan_sandesh')) || 'default';
      }
    }
  } catch (err) {
    logger.warn({ message: 'variantService unavailable, skipping', error: err.message });
  }

  // 4e. Get weekly theme + arc beat (non-fatal)
  let weeklyThemeContext = '';
  try {
    const db = require('../config/db');
    const { getArcBeat } = require('../jobs/weeklyThemeJob');
    const latestTheme = await db.weeklyTheme.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (latestTheme) {
      const arcBeat = getArcBeat(now.getDay());
      weeklyThemeContext = `This week's spiritual theme for ${user.name || 'this user'} is "${latestTheme.themeSanskrit}" (${latestTheme.themeEnglish}). Teaching: "${latestTheme.teaching}". Today's narrative arc: ${arcBeat.beat.toUpperCase()} — ${arcBeat.instruction}`;
    }
  } catch (err) {
    logger.warn({ message: 'weeklyTheme lookup unavailable, skipping', error: err.message });
  }

  // 5. Build the v2 prompt (with all injections)
  const date = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = promptService.buildDailyPromptV2({
    name: user.name,
    rashi: user.rashi,
    language: user.language,
    verse,
    date,
    panchang,
    raashifalLens: lens.label,
    raashifalLensInstruction: lens.inject,
    scenarioSeed,
    calendarContext,
    toneInstruction,
    variantPromptInstruction,
    weeklyThemeContext,
  });

  const systemInstruction = promptService.getSystemInstruction();

  // 6. Generate AI content
  const aiOutput = await aiService.generateText(prompt, systemInstruction);

  // 7. Parse the AI output into sections
  const { raashifal, shlokaCommentary, bhagwanSandesh } = parseAiOutputV2(aiOutput);

  // 8. Build the full WhatsApp-formatted 5-segment message
  const verseDisplay = verse.textSanskrit || verse.textHindi || verse.textEnglish;
  const transliteration = verse.transliteration || '';
  const hindiMeaning = verse.textHindi || verse.textEnglish;

  // Check for active festival campaign content
  let festivalSegment = '';
  try {
    const festivalService = require('./festivalService');
    const campaignContent = await festivalService.getTodayFestivalContent();
    if (campaignContent) {
      festivalSegment = `\n\n🎪 *${campaignContent.title}*\n${campaignContent.text}`;
    }
  } catch (err) {
    // Festival service is optional — don't break daily messages
    logger.debug({ message: 'Festival service unavailable', error: err.message });
  }

  const streakLine = user.streakCount > 0
    ? `\n\n🔥 Aapka Streak: Day ${user.streakCount}`
    : '';

  const fullText =
    `🙏 Jai Shri Ram, ${user.name || 'Bhakt'} ji\n\n` +
    `📅 *Aaj Ka Panchang*\n` +
    `${panchang.tithi} | Nakshatra: ${panchang.nakshatra}\n` +
    `Rahu Kaal: ${panchang.rahuKaal}\n` +
    `Shubh Rang: ${panchang.shubhRang} | Shubh Ank: ${panchang.shubhAnk}\n\n` +
    `🔯 *Aaj Ka Raashifal (${user.rashi || 'Mesh'})*\n` +
    `${raashifal}\n\n` +
    `📖 *Aaj Ka Shloka*\n` +
    `${verseDisplay}\n` +
    (transliteration ? `_${transliteration}_\n` : '') +
    `"${hindiMeaning}"\n` +
    `${shlokaCommentary}\n\n` +
    `💙 *Bhagwan Ka Sandesh*\n` +
    `"${bhagwanSandesh}" — Shri Krishna` +
    streakLine +
    festivalSegment +
    `\n\n✨ Yeh sandesh apne parivaar ke group mein zaroor bhejein 🙏`;

  // WhatsApp max is ~4096 chars for business — truncate at safety limit
  const MAX_CHARS = 3900;
  const safeText = fullText.length > MAX_CHARS
    ? fullText.substring(0, MAX_CHARS - 3) + '...'
    : fullText;

  logger.info({ message: 'Daily message v2 generated', userId: user.id, chars: safeText.length });

  // 9. Log content sent (non-blocking — fire and forget)
  const todayDate = new Date(dateStr); // YYYY-MM-DD parsed as UTC midnight
  setImmediate(async () => {
    try {
      await Promise.all([
        contentLogService.logContent({
          userId: user.id,
          contentType: 'verse',
          contentId: verse.id,
          contentTag: verse.tags?.[0] || null,
          date: todayDate,
        }),
        contentLogService.logContent({
          userId: user.id,
          contentType: 'raashifal',
          contentId: null,
          contentTag: lens.key,
          date: todayDate,
        }),
        contentLogService.logContent({
          userId: user.id,
          contentType: 'bhagwan_sandesh',
          contentId: null,
          contentTag: variantStyle,
          date: todayDate,
        }),
      ]);
    } catch (err) {
      logger.error({ message: 'ContentLog batch failed', userId: user.id, error: err.message });
    }
  });

  return {
    horoscope: raashifal,
    verse,
    challenge: shlokaCommentary,
    fullText: safeText,
    lensKey: lens.key,
  };
}

/**
 * Parses AI output into the three v2 sections.
 */
function parseAiOutputV2(text) {
  const raashifalMatch = text.match(
    /(?:RAASHIFAL[:\s]*)([\s\S]+?)(?=SHLOKA_COMMENTARY|$)/i
  );
  const commentaryMatch = text.match(
    /(?:SHLOKA_COMMENTARY[:\s]*)([\s\S]+?)(?=BHAGWAN_SANDESH|$)/i
  );
  const sandeshMatch = text.match(
    /(?:BHAGWAN_SANDESH[:\s]*)([\s\S]+?)$/i
  );

  const raashifal = raashifalMatch ? raashifalMatch[1].trim() : text.trim();
  const shlokaCommentary = commentaryMatch ? commentaryMatch[1].trim() : '';
  const bhagwanSandesh = sandeshMatch ? sandeshMatch[1].trim() : '';

  return { raashifal, shlokaCommentary, bhagwanSandesh };
}

module.exports = { generateDailyMessage, THEME_TAGS };
