'use strict';

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '../prompts');

function loadTemplate(filename) {
  return fs.readFileSync(path.join(PROMPTS_DIR, filename), 'utf-8');
}

/**
 * Builds the daily message prompt by substituting template variables (legacy v1).
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.rashi
 * @param {string} params.language - "en" | "hi" | "both"
 * @param {object} params.verse - Scripture object from DB
 * @param {string} params.date - ISO date string
 * @param {string} [params.tag] - Theme tag
 * @returns {string}
 */
function buildDailyPrompt({ name, rashi, language, verse, date, tag }) {
  const template = loadTemplate('daily.txt');

  const verseText = verse.textHindi && language === 'hi'
    ? verse.textHindi
    : verse.textEnglish;

  const bilingualInstruction =
    language === 'both'
      ? 'Write each section in Hindi first, then English (clearly labelled).'
      : language === 'hinglish'
        ? 'Write in Hinglish — a natural, warm mix of Hindi and English using Roman script. Do not use Devanagari.'
        : '';

  return template
    .replace('{{date}}', date || new Date().toISOString().split('T')[0])
    .replace('{{name}}', name || 'friend')
    .replace('{{rashi}}', rashi || 'your')
    .replace('{{language}}', LANGUAGE_LABELS[language] || 'English')
    .replace('{{tag}}', tag || 'dharma')
    .replace('{{verseText}}', verseText)
    .replace('{{verseReference}}', verse.reference)
    .replace('{{verseSource}}', verse.source)
    .replace('{{bilingualInstruction}}', bilingualInstruction);
}

/**
 * Builds the v2 daily message prompt with panchang, lens, scenario,
 * calendar context, tone instruction, variant, and weekly theme integration.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.rashi
 * @param {string} params.language
 * @param {object} params.verse - Scripture object from DB
 * @param {string} params.date
 * @param {object} params.panchang - Panchang data for today
 * @param {string} [params.raashifalLens] - Lens label (e.g. "Practical (Career & Money)")
 * @param {string} [params.raashifalLensInstruction] - Full lens injection instruction
 * @param {string} [params.scenarioSeed] - User micro-scenario seed text
 * @param {string} [params.calendarContext] - Hindu calendar context for today
 * @param {string} [params.toneInstruction] - Engagement-tier-based tone instruction
 * @param {string} [params.variantPromptInstruction] - A/B variant voice instruction for bhagwan_sandesh
 * @param {string} [params.weeklyThemeContext] - Weekly narrative theme context
 * @returns {string}
 */
function buildDailyPromptV2({
  name, rashi, language, verse, date, panchang,
  raashifalLens = '', raashifalLensInstruction = '', scenarioSeed = '',
  calendarContext = '', toneInstruction = '', variantPromptInstruction = '',
  weeklyThemeContext = '',
}) {
  const template = loadTemplate('daily_v2.txt');

  const verseText = verse.textSanskrit || verse.textHindi || verse.textEnglish;
  const transliteration = verse.transliteration || 'N/A';
  const tags = (verse.tags || []).join(', ');

  return template
    .replace(/{name}/g, name || 'Bhakt')
    .replace(/{rashi}/g, rashi || 'Mesh')
    .replace(/{tithi}/g, panchang.tithi || '')
    .replace(/{nakshatra}/g, panchang.nakshatra || '')
    .replace(/{rahuKaal}/g, panchang.rahuKaal || '')
    .replace(/{shubhRang}/g, panchang.shubhRang || '')
    .replace(/{shubhAnk}/g, String(panchang.shubhAnk || ''))
    .replace(/{verseText}/g, verseText)
    .replace(/{transliteration}/g, transliteration)
    .replace(/{reference}/g, verse.reference || '')
    .replace(/{tags}/g, tags)
    .replace(/{date}/g, date || new Date().toISOString().split('T')[0])
    .replace(/{language}/g, LANGUAGE_LABELS[language] || 'Hindi')
    .replace(/{raashifalLens}/g, raashifalLens)
    .replace(/{raashifalLensInstruction}/g, raashifalLensInstruction)
    .replace(/{scenarioSeed}/g, scenarioSeed)
    .replace(/{calendarContext}/g, calendarContext)
    .replace(/{toneInstruction}/g, toneInstruction)
    .replace(/{variantPromptInstruction}/g, variantPromptInstruction)
    .replace(/{weeklyThemeContext}/g, weeklyThemeContext);
}

/**
 * Builds a prompt from any template file with variable substitution.
 *
 * @param {string} templateFile - Filename in prompts directory
 * @param {object} vars - Key-value pairs for replacement
 * @returns {string}
 */
function buildPromptFromTemplate(templateFile, vars) {
  let template = loadTemplate(templateFile);
  for (const [key, value] of Object.entries(vars)) {
    template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || ''));
  }
  return template;
}

/**
 * Builds the chat prompt including conversation history.
 *
 * @param {object} params
 * @param {object} params.user - User record
 * @param {Array<{role: string, content: string}>} params.history - Last N conversation turns
 * @param {string} params.question - Incoming user question
 * @returns {string}
 */
function buildChatPrompt({ user, history, question }) {
  const template = loadTemplate('chat.txt');

  const historyText = history.length === 0
    ? '(No previous conversation)'
    : history
      .slice(-5) // last 5 turns
      .map(m => `${m.role === 'user' ? 'User' : 'Daily Dharma'}: ${m.content}`)
      .join('\n');

  const bilingualInstruction =
    user.language === 'both'
      ? 'Write your response in Hindi first, then English (clearly labelled).'
      : user.language === 'hi'
        ? 'Write your response in Hindi.'
        : user.language === 'hinglish'
          ? 'Write your response in Hinglish — a natural, warm mix of Hindi and English using Roman script. Do not use Devanagari.'
          : '';

  return template
    .replace('{{name}}', user.name || 'friend')
    .replace('{{rashi}}', user.rashi || 'not specified')
    .replace('{{language}}', LANGUAGE_LABELS[user.language] || 'English')
    .replace('{{history}}', historyText)
    .replace('{{question}}', question)
    .replace('{{bilingualInstruction}}', bilingualInstruction);
}

/**
 * Returns the system instruction from system.txt.
 * @returns {string}
 */
function getSystemInstruction() {
  return loadTemplate('system.txt');
}

const LANGUAGE_LABELS = {
  en: 'English',
  hi: 'Hindi',
  hinglish: 'Hinglish (a natural mix of Hindi and English, written in Roman script)',
  both: 'Hindi and English',
};

module.exports = {
  buildDailyPrompt,
  buildDailyPromptV2,
  buildPromptFromTemplate,
  buildChatPrompt,
  getSystemInstruction,
};
