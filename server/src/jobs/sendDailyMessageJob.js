'use strict';

const dailyMessageService = require('../services/dailyMessageService');
const { sendWhatsAppMessage } = require('../services/messageRouterService');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * BullMQ job processor: generates and delivers a daily message to one user.
 *
 * Job data shape: { userId: string }
 *
 * Steps:
 *  1. Load the user from DB
 *  2. Check whether a message was already sent today (idempotency guard)
 *  3. Generate message via dailyMessageService
 *  4. Send via Twilio WhatsApp
 *  5. Persist a DailyMessage record with sentAt
 */
async function processSendDailyMessage(job) {
  const { userId } = job.data;
  logger.info({ message: 'sendDailyMessageJob started', jobId: job.id, userId });

  // 1. Load user
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`sendDailyMessageJob: user not found — ${userId}`);
  }

  // 2. Idempotency: skip if already sent today (IST date)
  const todayIST = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  const existingMessage = await db.dailyMessage.findFirst({
    where: {
      userId,
      date: todayIST,
    },
  });

  if (existingMessage && existingMessage.sentAt) {
    logger.info({
      message: 'Daily message already sent today — skipping',
      userId,
      existingMessageId: existingMessage.id,
    });
    return { skipped: true };
  }

  // 3. Generate content
  const { horoscope, verse, challenge, fullText } = await dailyMessageService.generateDailyMessage(user);

  // 3b. Look up daily_image from MediaConfig (if configured)
  let mediaUrl = null;
  try {
    const imgConfig = await db.mediaConfig.findUnique({ where: { key: 'daily_image' } });
    if (imgConfig && imgConfig.url) mediaUrl = imgConfig.url;
  } catch (err) {
    logger.warn({ message: 'Could not fetch daily_image MediaConfig', error: err.message });
  }

  // 4. Send via WhatsApp (with optional image)
  await sendWhatsAppMessage(user.phone, fullText, mediaUrl);

  // 5. Persist DailyMessage record
  const record = await db.dailyMessage.upsert({
    where: {
      // Use existing record if created without sentAt (partial run recovery)
      id: existingMessage ? existingMessage.id : '__new__',
    },
    update: {
      horoscope,
      verseText: verse.textEnglish || '',
      verseId: verse.id || null,
      challenge,
      sentAt: new Date(),
    },
    create: {
      userId,
      date: todayIST,
      horoscope,
      verseText: verse.textEnglish || '',
      verseId: verse.id || null,
      challenge,
      sentAt: new Date(),
    },
  });

  logger.info({
    message: 'Daily message sent and recorded',
    userId,
    dailyMessageId: record.id,
    phone: user.phone,
  });

  return { sent: true, dailyMessageId: record.id };
}

module.exports = { processSendDailyMessage };
