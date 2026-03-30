'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const triviaService = require('./triviaService');
const aiService = require('./aiService');
const promptService = require('./promptService');
const logger = require('../utils/logger');

const FACTS_FILE = path.join(__dirname, '../../data/facts/thursday_facts.json');

let factsCache = null;

function loadFacts() {
  if (factsCache) return factsCache;
  factsCache = JSON.parse(fs.readFileSync(FACTS_FILE, 'utf-8'));
  return factsCache;
}

/**
 * Returns the Monday trivia question message and sets user's pendingInteraction.
 * @param {object} user - Full user record
 * @returns {Promise<string>} Formatted WhatsApp message
 */
async function getMondayTriviaQuestion(user) {
  try {
    const question = await triviaService.getTodaysQuestion();
    if (!question) {
      return '🙏 Aaj ka trivia sawaal uplabdh nahi hai. Kal phir prayaas karein!';
    }

    // Set pending interaction for trivia answer
    await db.user.update({
      where: { id: user.id },
      data: {
        pendingInteraction: JSON.stringify({
          type: 'trivia_answer',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: { questionId: question.id },
        }),
      },
    });

    const message =
      `🧠 *Somvaar Trivia!*\n\n` +
      `${triviaService.formatQuestionText(question)}\n\n` +
      `⏰ Aapke paas 24 ghante hain jawab dene ke liye!`;

    return message;
  } catch (err) {
    logger.error({ message: 'Failed to get Monday trivia question', userId: user.id, error: err.message });
    return '🙏 Trivia sawaal mein kuch samasya aayi. Kal phir prayaas karein!';
  }
}

/**
 * Returns the Monday trivia answer reveal message.
 * @param {string} userId
 * @returns {Promise<string>} Formatted answer reveal message
 */
async function getMondayTriviaAnswer(userId) {
  try {
    const todayIST = new Date(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    );

    const question = await db.triviaQuestion.findFirst({
      where: { usedOnDate: todayIST },
    });

    if (!question) {
      return '🙏 Aaj ka trivia sawaal nahi mila.';
    }

    // Check if user answered
    const answer = await db.triviaAnswer.findFirst({
      where: { userId, questionId: question.id },
    });

    let statusLine;
    if (!answer) {
      statusLine = '😔 Aapne jawab nahi diya — koi baat nahi, agle hafte zaroor dena!';
    } else if (answer.isCorrect) {
      statusLine = '✅ Aapka jawab SAHI tha! Bahut badhiya! 🌟';
    } else {
      statusLine = `❌ Aapka jawab galat tha. Aapne chuna: ${question.options[answer.selected]}`;
    }

    const message =
      `📢 *Trivia Ka Jawab!*\n\n` +
      `❓ ${question.question}\n\n` +
      `✅ Sahi jawab: *${question.options[question.answerIndex]}*\n\n` +
      `${statusLine}\n\n` +
      `💡 ${question.explanation}`;

    return message;
  } catch (err) {
    logger.error({ message: 'Failed to get trivia answer', userId, error: err.message });
    return '🙏 Trivia jawab mein kuch samasya aayi.';
  }
}

/**
 * Returns a Hanuman-focused devotional message for Tuesday (Mangalvar).
 * Also looks up the "tuesday_audio" MediaConfig key to attach an audio URL.
 *
 * @returns {Promise<{ text: string, mediaUrl: string|null }>}
 */
async function getTuesdayHanumanSpecial() {
  // Look up optional audio media config
  let mediaUrl = null;
  try {
    const config = await db.mediaConfig.findUnique({ where: { key: 'tuesday_audio' } });
    if (config) {
      mediaUrl = config.url;
    }
  } catch (err) {
    logger.warn({ message: 'Could not fetch tuesday_audio MediaConfig', error: err.message });
  }

  try {
    const prompt = `Generate a Mangalvar (Tuesday) Hanuman special message.

Include:
1. One Hanuman Chalisa chaupai (Hindi)
2. Its meaning in 1 simple line
3. A 2-line motivational message that connects Hanuman's specific quality (strength, devotion, service, fearlessness) to a real modern-life challenge — like a difficult meeting, a health worry, a fight at home.

Tone: Like a wise friend who loves Hanuman. Energetic, not temple-preachy.
BAD: "Aaj Hanuman ji ki puja karein, din acha rahega."
GOOD: "Jab darr lage, yaad karo — Hanuman ji ne akele Lanka jalaa di thi. Aapka woh email bhi bhej sakte ho."

Under 80 words. Hinglish okay.`;

    const systemInstruction = promptService.getSystemInstruction();
    const aiOutput = await aiService.generateText(prompt, systemInstruction);

    const text =
      `🔱 *Mangalvaar — Hanuman ji ki Kripa*\n\n` +
      `${aiOutput.trim()}\n\n` +
      `_Aaj Hanuman Chalisa ka paath karein — Bajrangbali aapke sankat haran karenge!_ 🙏`;

    return { text, mediaUrl };
  } catch (err) {
    logger.error({ message: 'Failed to generate Hanuman special', error: err.message });
    return {
      text: `🔱 *Mangalvaar — Hanuman ji ki Kripa*\n\nJai Hanuman gyan gun sagar, jai kapis tihun lok ujagar!\n\nAaj Bajrangbali ki kripa aap par barsegi. Himmat rakhein, Hanuman ji aapke saath hain! 🙏`,
      mediaUrl,
    };
  }
}

/**
 * Returns dream interpretation invitation for Wednesday, sets pendingInteraction.
 * @param {object} user
 * @returns {Promise<string>}
 */
async function getWednesdayDreamPrompt(user) {
  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        pendingInteraction: JSON.stringify({
          type: 'dream_prompt',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: {},
        }),
      },
    });

    return `🌙 *Budhvaar — Swapna Phal*\n\n` +
      `${user.name || 'Bhakt'} ji, kya aapne haal mein koi sapna dekha hai?\n\n` +
      `Hindu Swapna Shastra ke anusaar sapne divya sanket hote hain.\n\n` +
      `🔮 Apna sapna humein batayein — hum aapko uska adhyatmik arth batayenge!\n\n` +
      `_Bas apna sapna type karke bhej dijiye..._ ✨`;
  } catch (err) {
    logger.error({ message: 'Failed to set dream prompt', userId: user.id, error: err.message });
    return '🌙 Aaj Swapna Shastra ka din hai! Apna koi sapna humein batayein aur hum uska arth batayenge. 🙏';
  }
}

/**
 * Returns a mind-blowing Hindu religious fact for Thursday (Gemini-generated).
 * Falls back to static JSON if AI fails.
 * @returns {Promise<string>}
 */
async function getThursdayFact() {
  try {
    const prompt = `Generate ONE mind-blowing, lesser-known fact about Hinduism, Hindu mythology, or Sanatan Dharm.

Rules:
- Must be a REAL fact people don't know (not "Gita has 18 chapters" level)
- Should make people say "Wow, yeh nahi pata tha!"
- Examples of the RIGHT type: "Hanuman ji ka asli naam Maruti tha — Pawan Dev ke putra hone se unhe Pavanputra bhi kehte hain." / "Mahabharata mein 1.8 million words hain — yeh Iliad aur Odyssey se 10 guna bada hai." / "Ravan ek mahan Shiva bhakt tha — usne apna sar kaat ke Shiva ko arpit kiya tha."
- Write in Hinglish, 2-3 sentences max
- Start with "Kya aap jaante hain?" or "Did you know?"
- End with a hook: why this fact matters or a surprising connection

Output ONLY the fact. No preamble.`;

    const systemInstruction = promptService.getSystemInstruction();
    const fact = await aiService.generateText(prompt, systemInstruction);

    return `🧐 *Guruvaar — Kya Aap Jaante The?*\n\n` +
      `${fact.trim()}\n\n` +
      `_Yeh jaankari apne doston ke saath share karein!_ 🙏`;
  } catch (err) {
    logger.error({ message: 'Failed to generate Thursday fact via AI, falling back to static', error: err.message });
    // Fallback to static JSON
    try {
      const facts = loadFacts();
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
      const fact = facts[weekNum % facts.length];
      return `🧐 *Guruvaar — Kya Aap Jaante The?*\n\n${fact}\n\n_Yeh jaankari apne doston ke saath share karein!_ 🙏`;
    } catch {
      return '🧐 *Guruvaar Gyan*\n\nKya aap jaante hain? Ravan ek mahan Shiva bhakt tha — usne apna sar kaat ke Shiva ko arpit kiya tha! 🙏';
    }
  }
}

/**
 * Returns name meaning invitation for Friday, sets pendingInteraction.
 * @param {object} user
 * @returns {Promise<string>}
 */
async function getFridayNaamPrompt(user) {
  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        pendingInteraction: JSON.stringify({
          type: 'name_prompt',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: {},
        }),
      },
    });

    return `✨ *Shukravaar — Naam Ka Rahasya*\n\n` +
      `${user.name || 'Bhakt'} ji, har Hindu naam mein ek divya shakti chhipi hoti hai!\n\n` +
      `🔤 Kisi bhi Hindu naam ka adhyatmik arth jaanein — apna naam ya kisi priye ka naam bhejein.\n\n` +
      `_Bas naam type karke bhej dijiye..._ 🙏`;
  } catch (err) {
    logger.error({ message: 'Failed to set name prompt', userId: user.id, error: err.message });
    return '✨ Aaj Naam Rahasya ka din hai! Koi bhi Hindu naam bhejein aur uska adhyatmik arth jaanein. 🙏';
  }
}

/**
 * Returns Shani special message + weekly trivia leaderboard for Saturday.
 * @returns {Promise<string>}
 */
async function getSaturdayShaniLeaderboard() {
  try {
    const leaderboard = await triviaService.getWeeklyLeaderboard();

    let leaderboardText = '';
    if (leaderboard.length > 0) {
      const medals = ['🥇', '🥈', '🥉'];
      leaderboardText = '\n\n🏆 *Weekly Trivia Leaderboard:*\n' +
        leaderboard.map((entry, i) => {
          const medal = medals[i] || `${i + 1}.`;
          return `${medal} ${entry.name} — ${entry.score} points`;
        }).join('\n');
    }

    return `🪐 *Shanivaar — Shani Dev ki Kripa*\n\n` +
      `Aaj Shani Dev ka din hai. Shani Dev nyay ke devta hain — karma ka phal dete hain.\n\n` +
      `🙏 Aaj ka mantra: "Om Sham Shanaischaraye Namah"\n\n` +
      `Shani Dev aapko dhairya aur sanyam ka aashirvaad dein.` +
      leaderboardText +
      `\n\n_Shani Dev ki kripa ke liye sarson ka tel daan karein_ 🙏`;
  } catch (err) {
    logger.error({ message: 'Failed to get Saturday message', error: err.message });
    return '🪐 *Shanivaar — Shani Dev ki Kripa*\n\nOm Sham Shanaischaraye Namah 🙏';
  }
}

/**
 * Returns Sunday Q&A prompt, sets pendingInteraction.
 * @param {object} user
 * @returns {Promise<string>}
 */
async function getSundayQAPrompt(user) {
  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        pendingInteraction: JSON.stringify({
          type: 'open_qa',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          data: {},
        }),
      },
    });

    return `🙏 *Ravivaar — Bhagwan Se Poochhein*\n\n` +
      `${user.name || 'Bhakt'} ji, aaj ka din hai Bhagwan se seedha baat karne ka!\n\n` +
      `💙 Aap jo bhi sawaal poochhna chahein — dharm, karma, jeewan, rishte — kuch bhi!\n\n` +
      `Bhagwan Krishna aapko jawab denge, bilkul ek pyare pita ki tarah.\n\n` +
      `_Apna sawaal abhi bhejein..._ ✨`;
  } catch (err) {
    logger.error({ message: 'Failed to set Sunday QA prompt', userId: user.id, error: err.message });
    return '🙏 Aaj Bhagwan se koi bhi sawaal poochhein! Apna sawaal type karke bhejein. ✨';
  }
}

module.exports = {
  getMondayTriviaQuestion,
  getMondayTriviaAnswer,
  getTuesdayHanumanSpecial,
  getWednesdayDreamPrompt,
  getThursdayFact,
  getFridayNaamPrompt,
  getSaturdayShaniLeaderboard,
  getSundayQAPrompt,
};
