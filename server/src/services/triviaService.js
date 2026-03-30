'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const logger = require('../utils/logger');

const QUESTIONS_FILE = path.join(__dirname, '../../data/trivia/questions.json');

/**
 * Seeds trivia questions from JSON file into the database if not already present.
 * Called lazily on first use.
 */
async function ensureQuestionsSeeded() {
  const count = await db.triviaQuestion.count();
  if (count > 0) return;

  logger.info({ message: 'Seeding trivia questions from JSON' });

  const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
  const questions = JSON.parse(raw);

  for (const q of questions) {
    await db.triviaQuestion.create({
      data: {
        question: q.question,
        options: q.options,
        answerIndex: q.answerIndex,
        explanation: q.explanation,
      },
    });
  }

  logger.info({ message: `Seeded ${questions.length} trivia questions` });
}

/**
 * Gets today's trivia question. Picks an unused one and marks it as used.
 * @returns {Promise<object|null>} The trivia question record
 */
async function getTodaysQuestion() {
  await ensureQuestionsSeeded();

  const todayIST = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  // Check if a question is already assigned for today
  let todaysQ = await db.triviaQuestion.findFirst({
    where: { usedOnDate: todayIST },
  });

  if (todaysQ) return todaysQ;

  // Pick an unused question
  todaysQ = await db.triviaQuestion.findFirst({
    where: { usedOnDate: null },
    orderBy: { createdAt: 'asc' },
  });

  if (!todaysQ) {
    // All questions used — reset and reuse
    logger.info({ message: 'All trivia questions used — resetting usedOnDate' });
    await db.triviaQuestion.updateMany({
      data: { usedOnDate: null },
    });
    todaysQ = await db.triviaQuestion.findFirst({
      where: { usedOnDate: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!todaysQ) return null;

  // Mark as used today
  await db.triviaQuestion.update({
    where: { id: todaysQ.id },
    data: { usedOnDate: todayIST },
  });

  return todaysQ;
}

/**
 * Records a user's trivia answer and returns a formatted result message.
 *
 * @param {string} userId
 * @param {string} selectedOption - The user's answer text (e.g., "B", "b", "2", or full option text)
 * @param {object} [pendingData] - Optional data from pendingInteraction (may contain questionId)
 * @returns {Promise<string>} Formatted result message
 */
async function recordAnswer(userId, selectedOption, pendingData) {
  try {
    // Get today's question
    const question = pendingData?.questionId
      ? await db.triviaQuestion.findUnique({ where: { id: pendingData.questionId } })
      : await getTodaysQuestion();

    if (!question) {
      return '🙏 Aaj ka sawaal uplabdh nahi hai. Kal phir prayaas karein!';
    }

    // Check if already answered
    const existing = await db.triviaAnswer.findFirst({
      where: { userId, questionId: question.id },
    });

    if (existing) {
      return existing.isCorrect
        ? '✅ Aapne yeh sawaal pehle hi sahi jawab de diya hai! Shaandaar! 🌟'
        : `❌ Aapne pehle jawab de diya tha. Sahi jawab tha: ${question.options[question.answerIndex]}`;
    }

    // Parse the selected option
    const selectedIndex = parseOptionIndex(selectedOption, question.options);

    if (selectedIndex === -1) {
      return `🤔 Kripya A, B, C ya D mein se ek jawab dein.\n\n${formatQuestionText(question)}`;
    }

    const isCorrect = selectedIndex === question.answerIndex;

    // Record the answer
    await db.triviaAnswer.create({
      data: {
        userId,
        questionId: question.id,
        selected: selectedIndex,
        isCorrect,
      },
    });

    // Update trivia score if correct
    if (isCorrect) {
      await db.user.update({
        where: { id: userId },
        data: { triviaScore: { increment: 1 } },
      });
    }

    // Format result message
    if (isCorrect) {
      return `✅ *Bilkul sahi!* 🎉\n\n${question.explanation}\n\n🏆 Aapka trivia score +1 badh gaya!`;
    } else {
      return `❌ *Galat jawab!*\n\nSahi jawab: ${question.options[question.answerIndex]}\n\n${question.explanation}\n\n💪 Koi baat nahi — agle sawaal mein zaroor sahi jawab dena!`;
    }
  } catch (err) {
    logger.error({ message: 'Failed to record trivia answer', userId, error: err.message });
    return '🙏 Trivia jawab mein kuch samasya aayi. Kripya thodi der baad prayaas karein.';
  }
}

/**
 * Parses user input into an option index (0-3).
 * Accepts: "A", "a", "1", or full option text.
 */
function parseOptionIndex(input, options) {
  const cleaned = input.trim().toUpperCase();

  // Direct letter match
  const letterMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
  if (letterMap[cleaned] !== undefined) return letterMap[cleaned];

  // Number match (1-indexed)
  const num = parseInt(cleaned, 10);
  if (num >= 1 && num <= 4) return num - 1;

  // Try to match against option text
  for (let i = 0; i < options.length; i++) {
    if (options[i].toLowerCase().includes(cleaned.toLowerCase())) {
      return i;
    }
  }

  return -1;
}

/**
 * Formats a trivia question for WhatsApp display.
 */
function formatQuestionText(question) {
  return `❓ *Aaj Ka Sawaal:*\n\n${question.question}\n\n${question.options.join('\n')}\n\n_Apna jawab bhejein (A/B/C/D)_`;
}

/**
 * Returns the weekly trivia leaderboard (top 10 users).
 * @returns {Promise<Array<{name: string, score: number}>>}
 */
async function getWeeklyLeaderboard() {
  try {
    // Get top 10 users by triviaScore
    const topUsers = await db.user.findMany({
      where: { triviaScore: { gt: 0 } },
      orderBy: { triviaScore: 'desc' },
      take: 10,
      select: { name: true, triviaScore: true },
    });

    return topUsers.map((u, i) => ({
      rank: i + 1,
      name: u.name || 'Bhakt',
      score: u.triviaScore,
    }));
  } catch (err) {
    logger.error({ message: 'Failed to get leaderboard', error: err.message });
    return [];
  }
}

module.exports = {
  getTodaysQuestion,
  recordAnswer,
  getWeeklyLeaderboard,
  formatQuestionText,
  ensureQuestionsSeeded,
};
