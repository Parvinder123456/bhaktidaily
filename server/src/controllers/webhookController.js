'use strict';

const messageRouterService = require('../services/messageRouterService');
const logger = require('../utils/logger');

/**
 * Handles incoming Twilio WhatsApp webhook POST requests.
 */
async function handleWebhook(req, res) {
  const from = req.body.From;
  const body = (req.body.Body || '').trim();

  logger.info({ message: 'Incoming WhatsApp message', from, body });

  // Normalise phone: Twilio sends "whatsapp:+1234567890"
  const phone = from ? from.replace(/^whatsapp:/, '') : null;

  if (!phone) {
    logger.warn({ message: 'Webhook received without valid From field' });
    return res.status(400).json({ error: 'Missing From field' });
  }

  // Acknowledge the webhook immediately to prevent Twilio 15-second timeout
  res.status(200).send('');

  // Process the message asynchronously
  messageRouterService.routeMessage(phone, body)
    .then(async ({ replyText }) => {
      if (replyText) {
        await messageRouterService.sendWhatsAppMessage(phone, replyText);
      }
    })
    .catch((err) => {
      logger.error({ message: 'Error in async message processing', phone, error: err.message });
    });
}

module.exports = { handleWebhook };
