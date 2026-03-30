'use strict';

const { generateText } = require('./aiService');
const logger = require('../utils/logger');

const RASHI_LIST = [
  'Mesh (Aries)',
  'Vrishabh (Taurus)',
  'Mithun (Gemini)',
  'Kark (Cancer)',
  'Simha (Leo)',
  'Kanya (Virgo)',
  'Tula (Libra)',
  'Vrishchik (Scorpio)',
  'Dhanu (Sagittarius)',
  'Makar (Capricorn)',
  'Kumbh (Aquarius)',
  'Meen (Pisces)',
];

const RASHI_NAMES = [
  'Mesh',
  'Vrishabh',
  'Mithun',
  'Kark',
  'Simha',
  'Kanya',
  'Tula',
  'Vrishchik',
  'Dhanu',
  'Makar',
  'Kumbh',
  'Meen',
];

const RASHI_MENU = RASHI_LIST.map((r, i) => `${i + 1}. ${r}`).join('\n');

const DELIVERY_OPTIONS = {
  '1': '06:00',
  '2': '07:00',
  '3': '08:00',
};

/**
 * Main onboarding state machine handler.
 *
 * @param {object} user - Current user record from DB
 * @param {string} incomingMessage - Raw text from WhatsApp
 * @returns {Promise<{ responseText: string, nextStep: number, fieldsToUpdate: object }>}
 */
async function handleOnboarding(user, incomingMessage) {
  const step = user.onboardingStep || 0;
  const msg = (incomingMessage || '').trim();

  switch (step) {
    case 0:
      return handleStep0(msg);

    case 1:
      return handleStep1(user, msg);

    case 2:
      return handleStep2(user, msg);

    case 3:
      return handleStep3(user, msg);

    case 4:
      return handleStep4(user, msg);

    default:
      return {
        responseText: buildGreeting(),
        nextStep: 0,
        fieldsToUpdate: { onboardingStep: 0 },
      };
  }
}

// Step 0 — Greeting + ask name
function handleStep0() {
  return {
    responseText: buildGreeting(),
    nextStep: 1,
    fieldsToUpdate: { onboardingStep: 1 },
  };
}

// Step 1 — Receive name, ask Rashi
function handleStep1(user, msg) {
  if (!msg || msg.length < 1) {
    return {
      responseText: buildGreeting(),
      nextStep: 1,
      fieldsToUpdate: {},
    };
  }

  const name = capitalise(msg.split(' ')[0]); // Use first word as name

  return {
    responseText:
      `Bahut sundar naam hai, ${name} ji! 🙏\n\n` +
      `Aapki Rashi kya hai?\n\n${RASHI_MENU}\n\nNumber reply karein.`,
    nextStep: 2,
    fieldsToUpdate: { name, onboardingStep: 2 },
  };
}

// Step 2 — Receive Rashi, ask language
function handleStep2(user, msg) {
  const choice = parseInt(msg, 10);

  if (isNaN(choice) || choice < 1 || choice > 12) {
    return {
      responseText:
        `Kripya 1 se 12 ke beech ek number reply karein.\n\n${RASHI_MENU}`,
      nextStep: 2,
      fieldsToUpdate: {},
    };
  }

  const rashi = RASHI_NAMES[choice - 1];

  return {
    responseText:
      `${rashi} Rashi — noted! ✨\n\n` +
      `Aap kaunsi language prefer karte hain?\n\n` +
      `1. English\n2. हिन्दी (Hindi)\n3. Hinglish (Hindi + English mix)\n4. Both (Hindi & English separately)\n\nReply with 1, 2, 3, or 4.`,
    nextStep: 3,
    fieldsToUpdate: { rashi, onboardingStep: 3 },
  };
}

// Step 3 — Receive language, ask delivery time
function handleStep3(user, msg) {
  const LANGUAGE_MAP = { '1': 'en', '2': 'hi', '3': 'hinglish', '4': 'both' };
  const language = LANGUAGE_MAP[msg];

  if (!language) {
    return {
      responseText:
        `Kripya 1, 2, 3, ya 4 reply karein:\n\n1. English\n2. हिन्दी (Hindi)\n3. Hinglish (Hindi + English mix)\n4. Both (Hindi & English separately)`,
      nextStep: 3,
      fieldsToUpdate: {},
    };
  }

  return {
    responseText:
      `Perfect! 😊 Aapka daily message kab bhejna chahiye? ☀️\n\n` +
      `1. 6:00 AM\n2. 7:00 AM\n3. 8:00 AM\n4. Custom time (HH:MM mein, jaise 09:30)\n\nYa simply likhein — "abhi", "subah 7 baje", "8 AM" — main samajh lunga! 😊`,
    nextStep: 4,
    fieldsToUpdate: { language, onboardingStep: 4 },
  };
}

// Step 4 — Receive delivery time, confirm and complete onboarding
async function handleStep4(user, msg) {
  let deliveryTime = DELIVERY_OPTIONS[msg];

  if (!deliveryTime) {
    // Try to parse HH:MM custom time
    const timeMatch = msg.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (timeMatch) {
      deliveryTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
  }

  if (!deliveryTime) {
    // Try Gemini to interpret natural language time (e.g. "abhi", "now", "subah 7 baje")
    deliveryTime = await parseTimeWithGemini(msg);
  }

  if (!deliveryTime) {
    return {
      responseText:
        `Kripya ek time choose karein:\n\n` +
        `1. 6:00 AM\n2. 7:00 AM\n3. 8:00 AM\n4. Custom time (HH:MM mein, jaise 09:30)\n\nYa "abhi" likhein current time ke liye!`,
      nextStep: 4,
      fieldsToUpdate: {},
    };
  }

  const [hour, minute] = deliveryTime.split(':');
  const hourNum = parseInt(hour, 10);
  const period = hourNum < 12 ? 'AM' : 'PM';
  const displayHour = hourNum > 12 ? hourNum - 12 : hourNum || 12;
  const displayTime = `${displayHour}:${minute} ${period}`;

  const name = user.name || 'friend';
  const rashi = user.rashi || 'aapki';

  return {
    responseText:
      `Sab set ho gaya, ${name} ji! 🎉\n\n` +
      `Kal se ${displayTime} IST par aapko milega:\n\n` +
      `📅 Aaj ka Panchang\n` +
      `🔯 ${rashi} Rashi ka haal\n` +
      `📖 Ek sacred shloka\n` +
      `💙 Bhagwan ka personal sandesh\n` +
      `🔥 Aapka streak\n\n` +
      `Kuch bhi poochna ho — dharma, prayers, ya life guidance — bas message karein! 🙏\n\n` +
      `_Jai Shri Ram!_ 🙏`,
    nextStep: 5,
    fieldsToUpdate: { deliveryTime, isOnboarded: true, onboardingStep: 5 },
  };
}

/**
 * Uses Gemini to parse a natural language time string into HH:MM (24h IST).
 * Returns null if it can't be interpreted.
 */
async function parseTimeWithGemini(input) {
  // Get current IST time
  const nowIST = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const prompt =
    `The user is choosing a daily message delivery time. Current IST time is ${nowIST}.\n` +
    `User said: "${input}"\n\n` +
    `Extract the intended delivery time. If the user means "now" or "abhi" or similar, use the current time.\n` +
    `Reply with ONLY the time in HH:MM 24-hour format (e.g. 07:30). If you cannot determine a time, reply with exactly: UNKNOWN`;

  try {
    const result = await generateText(prompt);
    const cleaned = result.trim().split('\n')[0].trim();
    if (cleaned === 'UNKNOWN') return null;
    const match = cleaned.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return null;
  } catch (err) {
    logger.warn({ message: 'Gemini time parse failed', input, error: err.message });
    return null;
  }
}

function buildGreeting() {
  return (
    '🙏 Jai Shri Ram! Daily Dharma mein aapka swagat hai — aapka personal Hindu spiritual companion.\n\n' +
    'Har subah aapko milega:\n' +
    '📅 Aaj ka Panchang\n' +
    '🔯 Aapka Raashifal\n' +
    '📖 Ek sacred shloka\n' +
    '💙 Bhagwan ka sandesh\n\n' +
    'Shuru karte hain! Aapka naam kya hai? 😊'
  );
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = {
  handleOnboarding,
  RASHI_NAMES,
  RASHI_LIST,
};
