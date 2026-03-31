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
        } else {
          logger.info({ message: 'Non-text message received, ignoring', type: msg.type, from: msg.from });
        }
      }
    }
  }
}

module.exports = { handleWebhook, handleVerification };
