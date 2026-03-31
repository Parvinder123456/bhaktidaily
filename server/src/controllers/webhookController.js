'use strict';

const messageRouterService = require('../services/messageRouterService');
const logger = require('../utils/logger');

/**
 * GET handler — Meta's one-time webhook verification.
 * Meta sends hub.mode, hub.verify_token, and hub.challenge as query params.
 */
function handleVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info({ message: 'Meta webhook verification succeeded' });
    return res.status(200).send(challenge);
  }

  logger.warn({ message: 'Meta webhook verification failed', mode, token });
  return res.status(403).json({ error: 'Forbidden — verification failed' });
}

/**
 * POST handler — processes incoming Meta WhatsApp webhook events.
 */
async function handleWebhook(req, res) {
  // Meta requires a fast 200 response
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;

  if (body.object !== 'whatsapp_business_account') {
    logger.info({ message: 'Webhook received for non-whatsapp object', object: body.object });
    return;
  }

  const entries = body.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];

    for (const change of changes) {
      const value = change.value;
      if (!value) continue;

      // Handle status updates (delivery receipts, read receipts, etc.)
      if (value.statuses && value.statuses.length > 0) {
        logger.info({
          message: 'WhatsApp status update received',
          statuses: value.statuses.map(s => ({ id: s.id, status: s.status, recipientId: s.recipient_id })),
        });
        continue;
      }

      // Process incoming messages
      const messages = value.messages || [];

      for (const msg of messages) {
        if (msg.type === 'text') {
          // Meta sends phone without '+', we add it back for E.164 normalization
          const phone = '+' + msg.from;
          const text = msg.text?.body || '';

          logger.info({ message: 'Incoming WhatsApp message', phone, text, messageId: msg.id });

          // Process asynchronously — don't block the loop
          messageRouterService.routeMessage(phone, text)
            .then(async ({ replyText }) => {
              if (replyText) {
                await messageRouterService.sendWhatsAppMessage(phone, replyText);
              }
            })
            .catch((err) => {
              logger.error({ message: 'Error in async message processing', phone, error: err.message });
            });
        } else if (msg.type === 'interactive') {
          const phone = '+' + msg.from;
          const buttonId = msg.interactive?.button_reply?.id;
          const buttonTitle = msg.interactive?.button_reply?.title || '';

          logger.info({ message: 'Button reply received', phone, buttonId, buttonTitle, messageId: msg.id });

          if (buttonId === 'jai_shri_ram') {
            // User tapped the nudge button — 24h window is now open.
            handleDailyNudgeUnlock(phone).catch((err) => {
              logger.error({ message: 'Error handling daily nudge unlock', phone, error: err.message });
            });
          } else {
            // Other button replies — route as regular message using button title as text
            messageRouterService.routeMessage(phone, buttonTitle)
              .then(async ({ replyText }) => {
                if (replyText) {
                  await messageRouterService.sendWhatsAppMessage(phone, replyText);
                }
              })
              .catch((err) => {
                logger.error({ message: 'Error routing button reply', phone, error: err.message });
              });
          }
        } else {
          logger.info({ message: 'Non-text message received, ignoring', type: msg.type, from: msg.from });
        }
      }
    }
  }
}

/**
 * Handles the "Jai Shri Ram" nudge button tap.
 * The 24h session window is now open — generate and send the full daily message.
 */
async function handleDailyNudgeUnlock(phone) {
  const db = require('../config/db');
  const dailyMessageService = require('../services/dailyMessageService');

  const user = await db.user.findFirst({ where: { phone } });
  if (!user) {
    logger.warn({ message: 'handleDailyNudgeUnlock: user not found', phone });
    return;
  }

  // Check if we already sent today's full message (could have been sent via direct path)
  const todayIST = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const existing = await db.dailyMessage.findFirst({
    where: { userId: user.id, date: todayIST },
  });

  if (existing && existing.sentAt) {
    logger.info({ message: 'Daily message already sent today — skipping nudge unlock', userId: user.id });
    return;
  }

  // Generate and send the full daily message
  const { horoscope, verse, challenge, fullText } = await dailyMessageService.generateDailyMessage(user);

  let mediaUrl = null;
  try {
    const imgConfig = await db.mediaConfig.findUnique({ where: { key: 'daily_image' } });
    if (imgConfig?.url) mediaUrl = imgConfig.url;
  } catch (_) {
    // Silently ignore — image is optional
  }

  await messageRouterService.sendWhatsAppMessage(phone, fullText, mediaUrl);

  // Persist the DailyMessage record
  await db.dailyMessage.upsert({
    where: { id: existing ? existing.id : '__new__' },
    update: {
      horoscope,
      verseText: verse.textEnglish || '',
      verseId: verse.id || null,
      challenge,
      sentAt: new Date(),
    },
    create: {
      userId: user.id,
      date: todayIST,
      horoscope,
      verseText: verse.textEnglish || '',
      verseId: verse.id || null,
      challenge,
      sentAt: new Date(),
    },
  });

  logger.info({ message: 'Daily message sent via nudge unlock', userId: user.id, phone });
}

module.exports = { handleWebhook, handleVerification };
