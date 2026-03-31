'use strict';

const dailyMessageService = require('../services/dailyMessageService');
const { sendWhatsAppMessage, sendTemplateMessage } = require('../services/messageRouterService');
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
 *  3. Check 24h session window — send nudge template if outside, return early
 *  4. Generate message via dailyMessageService (only if within window)
 *  5. Send via Meta WhatsApp Cloud API
 *  6. Persist a DailyMessage record with sentAt
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

  // 3. Check 24-hour session window BEFORE generating AI content
  const now = new Date();
  const lastInteraction = user.lastInteraction ? new Date(user.lastInteraction) : null;
  const hoursAgo = lastInteraction ? (now - lastInteraction) / (1000 * 60 * 60) : Infinity;
  const withinSessionWindow = hoursAgo < 23; // 23h buffer for safety

  if (!withinSessionWindow) {
    // Outside 24h window — send nudge template instead of full message
    const firstName = user.name ? user.name.split(' ')[0] : 'Bhakt';

    await sendTemplateMessage(user.phone, 'daily_blessing_nudge', 'en', [
      { type: 'body', parameters: [{ type: 'text', text: firstName }] },
    ]);

    // Create placeholder record so nudge-unlock handler knows a record exists for today
    if (!existingMessage) {
      await db.dailyMessage.create({
        data: { userId, date: todayIST, horoscope: '', verseText: '', challenge: '' },
      });
    }

    logger.info({ message: 'Nudge template sent — outside 24h window', userId, phone: user.phone, hoursAgo: hoursAgo.toFixed(1) });
    return { nudgeSent: true };
  }

  // 4. Generate content (only reached if within session window)
  const { horoscope, verse, challenge, fullText } = await dailyMessageService.generateDailyMessage(user);

  // 4b. Look up daily_image from MediaConfig (if configured)
  let mediaUrl = null;
  try {
    const imgConfig = await db.mediaConfig.findUnique({ where: { key: 'daily_image' } });
    if (imgConfig && imgConfig.url) mediaUrl = imgConfig.url;
  } catch (err) {
    logger.warn({ message: 'Could not fetch daily_image MediaConfig', error: err.message });
  }

  // 5. Send via WhatsApp (with optional image)
  await sendWhatsAppMessage(user.phone, fullText, mediaUrl);

  // 6. Persist DailyMessage record
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
