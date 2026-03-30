'use strict';

const bonusMessageService = require('../services/bonusMessageService');
const { sendWhatsAppMessage } = require('../services/messageRouterService');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * BullMQ job processor: generates and delivers a bonus message to one user.
 *
 * Job data shape: { userId: string, type: string }
 *
 * Types:
 *  - monday_trivia_question
 *  - monday_trivia_answer
 *  - tuesday_hanuman
 *  - wednesday_dream
 *  - thursday_fact
 *  - friday_naam
 *  - saturday_shani
 *  - sunday_qa
 */
async function processBonusMessage(job) {
  const { userId, type } = job.data;
  logger.info({ message: 'bonusMessageJob started', jobId: job.id, userId, type });

  // 1. Load user
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`bonusMessageJob: user not found — ${userId}`);
  }

  // 2. Idempotency: check if already sent today
  const todayIST = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  const existing = await db.bonusMessage.findUnique({
    where: {
      userId_date_type: {
        userId,
        date: todayIST,
        type,
      },
    },
  });

  if (existing) {
    logger.info({ message: 'Bonus message already sent today — skipping', userId, type });
    return { skipped: true };
  }

  // 3. Generate the message content based on type
  // Most handlers return a plain string; tuesday_hanuman returns { text, mediaUrl }.
  let messageText;
  let mediaUrl = null;

  switch (type) {
    case 'monday_trivia_question':
      messageText = await bonusMessageService.getMondayTriviaQuestion(user);
      break;
    case 'monday_trivia_answer':
      messageText = await bonusMessageService.getMondayTriviaAnswer(userId);
      break;
    case 'tuesday_hanuman': {
      const result = await bonusMessageService.getTuesdayHanumanSpecial();
      messageText = result.text;
      mediaUrl = result.mediaUrl;
      break;
    }
    case 'wednesday_dream':
      messageText = await bonusMessageService.getWednesdayDreamPrompt(user);
      break;
    case 'thursday_fact':
      messageText = await bonusMessageService.getThursdayFact();
      break;
    case 'friday_naam':
      messageText = await bonusMessageService.getFridayNaamPrompt(user);
      break;
    case 'saturday_shani':
      messageText = await bonusMessageService.getSaturdayShaniLeaderboard();
      break;
    case 'sunday_qa':
      messageText = await bonusMessageService.getSundayQAPrompt(user);
      break;
    default:
      logger.warn({ message: 'Unknown bonus message type', type, userId });
      return { skipped: true, reason: 'unknown type' };
  }

  // 4. Send via WhatsApp (mediaUrl is null for most types, only set for tuesday_hanuman)
  await sendWhatsAppMessage(user.phone, messageText, mediaUrl);

  // 5. Record the bonus message (idempotency)
  await db.bonusMessage.create({
    data: {
      userId,
      type,
      date: todayIST,
    },
  });

  logger.info({ message: 'Bonus message sent and recorded', userId, type });
  return { sent: true, type };
}

module.exports = { processBonusMessage };
