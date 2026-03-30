'use strict';

const express = require('express');
const router = express.Router();

// Lazy-load db so routes can be tested without a live database
let db;
function getDb() {
  if (!db) {
    db = require('../config/db');
  }
  return db;
}

router.get('/health', async (req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString() };

  try {
    // 3-second timeout so a slow DB doesn't block the health check
    await Promise.race([
      getDb().$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    health.db = 'connected';
  } catch (_err) {
    health.db = 'disconnected';
  }

  res.status(200).json(health);
});

// ─── DEV ONLY: Immediately generate and send a daily message ───────────────────
if (process.env.NODE_ENV !== 'production') {
  router.post('/test/send-now', async (req, res) => {
    // Lazy require inside handler — avoids module resolution issues at startup
    const dailyMessageService = require('../services/dailyMessageService');
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const { phone } = req.body;

    // Find user — by phone if provided, else first onboarded user
    const user = phone
      ? await getDb().user.findUnique({ where: { phone } })
      : await getDb().user.findFirst({ where: { isOnboarded: true } });

    if (!user) {
      return res.status(404).json({ error: 'No onboarded user found' });
    }

    const { fullText } = await dailyMessageService.generateDailyMessage(user);

    const message = await twilio.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${user.phone}`,
      body: fullText,
    });

    return res.json({
      success: true,
      sid: message.sid,
      sentTo: user.phone,
      preview: fullText.substring(0, 200) + '...',
    });
  });
}

module.exports = router;

