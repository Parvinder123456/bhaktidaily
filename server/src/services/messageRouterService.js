'use strict';

const twilio = require('twilio');
const userService = require('./userService');
const onboardingService = require('./onboardingService');
const streakService = require('./streakService');
const contentLogService = require('./contentLogService');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Sends a WhatsApp message via Twilio.
 * @param {string} to       - Phone number (E.164 format, e.g. +917XXXXXXXXX)
 * @param {string} body     - Message text
 * @param {string} [mediaUrl] - Optional public URL of media to attach (audio / image)
 */
async function sendWhatsAppMessage(to, body, mediaUrl) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const from = process.env.TWILIO_WHATSAPP_FROM;

  const params = {
    from: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    body,
  };

  // Twilio WhatsApp limits body to 1600 chars when media is attached.
  // If text fits, combine them. Otherwise send text first, image after.
  if (mediaUrl && body.length <= 1600) {
    params.mediaUrl = [mediaUrl];
  }

  const message = await client.messages.create(params);
  logger.info({ message: 'WhatsApp message sent', to, sid: message.sid, hasMedia: !!mediaUrl });

  // Send image separately if body was too long for combined send
  if (mediaUrl && body.length > 1600) {
    const imgMsg = await client.messages.create({
      from: params.from,
      to: params.to,
      body: '🖼️',
      mediaUrl: [mediaUrl],
    });
    logger.info({ message: 'WhatsApp media sent separately (body too long)', to, sid: imgMsg.sid });
  }

  return message;
}

/**
 * Routes an incoming WhatsApp message to the appropriate handler.
 *
 * Flow:
 *   - New user    -> create + begin onboarding (step 0)
 *   - In progress -> continue onboarding
 *   - Completed   -> check pendingInteraction, then record streak, route to chat
 *
 * @param {string} phone - Normalised E.164 phone number
 * @param {string} body - Incoming message text
 * @returns {{ replyText: string }}
 */
async function routeMessage(phone, body) {
  let user = await userService.findByPhone(phone);

  // First contact — create user and start onboarding
  if (!user) {
    user = await userService.createUser(phone);
    logger.info({ message: 'New user created', phone });
  }

  if (!user.isOnboarded) {
    const { responseText, nextStep, fieldsToUpdate } = await onboardingService.handleOnboarding(
      user,
      body
    );

    // Persist state changes returned by the state machine
    if (Object.keys(fieldsToUpdate).length > 0) {
      await userService.updateUser(phone, fieldsToUpdate);
    }

    return { replyText: responseText };
  }

  // ---- Fully onboarded user ------------------------------------------------

  // 1. Check for pending interaction before routing to generic chat
  const pendingReply = await handlePendingInteraction(user, body);
  if (pendingReply) {
    // Still record streak interaction
    try {
      await streakService.recordInteraction(user.id);
    } catch (err) {
      logger.error({ message: 'streakService.recordInteraction failed', userId: user.id, error: err.message });
    }
    return { replyText: pendingReply };
  }

  // 2. Record streak interaction (updates lastInteraction + streakCount)
  let milestoneMessage = null;
  try {
    milestoneMessage = await streakService.recordInteraction(user.id);
  } catch (err) {
    logger.error({ message: 'streakService.recordInteraction failed', userId: user.id, error: err.message });
  }

  // 3. Mark the latest daily message as replied if one exists for today
  const todayIST = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  try {
    await db.dailyMessage.updateMany({
      where: {
        userId: user.id,
        date: todayIST,
        replied: false,
      },
      data: { replied: true },
    });
  } catch (err) {
    logger.error({ message: 'Failed to mark daily message as replied', userId: user.id, error: err.message });
  }

  // 3b. Mark ContentLog replies for today (engagement tracking)
  setImmediate(() => {
    contentLogService.markReplyAll(user.id, todayIST)
      .catch(err => logger.error({ message: 'Failed to mark ContentLog replies', userId: user.id, error: err.message }));
  });

  // 4. Route to chat handler
  let replyText;
  try {
    const chatController = require('../controllers/chatController');
    replyText = await chatController.handleChat(phone, body);
  } catch (err) {
    logger.error({ message: 'chatController.handleChat failed', phone, error: err.message });
    replyText =
      '🙏 Namaste! I am here to guide you. Our full conversation feature is coming very soon. In the meantime, your daily message will arrive at your chosen time.';
  }

  // 5. Append milestone message if applicable
  if (milestoneMessage) {
    replyText = `${replyText}\n\n${milestoneMessage}`;
  }

  return { replyText };
}

/**
 * Checks and handles a pending interaction for the user.
 * If the user has an active (non-expired) pending interaction, routes to the appropriate handler.
 *
 * @param {object} user - Full user record
 * @param {string} body - Incoming message text
 * @returns {Promise<string|null>} Reply text if handled, null if no pending interaction
 */
async function handlePendingInteraction(user, body) {
  if (!user.pendingInteraction) return null;

  let pending;
  try {
    pending = JSON.parse(user.pendingInteraction);
  } catch (err) {
    logger.warn({ message: 'Invalid pendingInteraction JSON', userId: user.id });
    await clearPendingInteraction(user.id);
    return null;
  }

  // Check expiry
  if (pending.expiresAt && new Date(pending.expiresAt) < new Date()) {
    logger.info({ message: 'Pending interaction expired', userId: user.id, type: pending.type });
    await clearPendingInteraction(user.id);
    return null;
  }

  let replyText = null;

  try {
    switch (pending.type) {
      case 'name_prompt': {
        const nameService = require('./nameService');
        replyText = await nameService.getNameMeaning(body.trim());
        break;
      }
      case 'dream_prompt': {
        const dreamService = require('./dreamService');
        replyText = await dreamService.interpretDream(body.trim(), user.name);
        break;
      }
      case 'trivia_answer': {
        const triviaService = require('./triviaService');
        replyText = await triviaService.recordAnswer(user.id, body.trim(), pending.data);
        break;
      }
      case 'open_qa': {
        // Route to regular chat handler — the pending interaction just indicates
        // this was a prompted Q&A session. Clear it and let normal chat handle.
        await clearPendingInteraction(user.id);
        return null;
      }
      default:
        logger.warn({ message: 'Unknown pending interaction type', type: pending.type, userId: user.id });
        await clearPendingInteraction(user.id);
        return null;
    }
  } catch (err) {
    logger.error({ message: 'Error handling pending interaction', userId: user.id, type: pending.type, error: err.message });
    replyText = '🙏 Kshama karein, kuch technical samasya aa gayi. Kripya thodi der baad phir prayaas karein.';
  }

  // Clear the pending interaction after handling
  await clearPendingInteraction(user.id);

  return replyText;
}

/**
 * Clears the pending interaction for a user.
 * @param {string} userId
 */
async function clearPendingInteraction(userId) {
  try {
    await db.user.update({
      where: { id: userId },
      data: { pendingInteraction: null },
    });
  } catch (err) {
    logger.error({ message: 'Failed to clear pendingInteraction', userId, error: err.message });
  }
}

module.exports = { routeMessage, sendWhatsAppMessage };
