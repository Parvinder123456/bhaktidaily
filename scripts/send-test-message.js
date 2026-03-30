'use strict';

/**
 * One-shot script: generate and send a daily message to a user immediately.
 * Usage: node scripts/send-test-message.js +91XXXXXXXXXX
 *
 * If no phone number is provided, sends to the first fully-onboarded user in the DB.
 */

require('dotenv').config({ path: './server/.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// These must be resolved after env is loaded
const dailyMessageService = require('../server/src/services/dailyMessageService');
const twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function main() {
  const phone = process.argv[2] || null;

  // Find the user
  let user;
  if (phone) {
    user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      console.error(`❌ No user found with phone: ${phone}`);
      process.exit(1);
    }
  } else {
    user = await prisma.user.findFirst({ where: { isOnboarded: true } });
    if (!user) {
      console.error('❌ No onboarded users found in the database.');
      process.exit(1);
    }
  }

  console.log(`\n📱 Sending test daily message to: ${user.name || 'User'} (${user.phone})`);
  console.log(`   Rashi: ${user.rashi}  |  Language: ${user.language}\n`);

  // Generate the message
  const { fullText } = await dailyMessageService.generateDailyMessage(user);

  console.log('─'.repeat(60));
  console.log('📩 Generated Message:\n');
  console.log(fullText);
  console.log('─'.repeat(60));

  // Look up daily_image from MediaConfig
  let mediaUrl = null;
  try {
    const config = await prisma.mediaConfig.findUnique({ where: { key: 'daily_image' } });
    if (config && config.url) {
      mediaUrl = config.url;
      console.log(`\n🖼️  Attaching daily_image: ${mediaUrl}`);
    } else {
      console.log('\n📝 No daily_image configured — sending text only.');
    }
  } catch (err) {
    console.log(`\n⚠️  Could not fetch daily_image: ${err.message}`);
  }

  // Send via Twilio WhatsApp
  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;
  const to = `whatsapp:${user.phone}`;

  console.log(`\n🚀 Sending to WhatsApp (${to})...`);

  const messagePayload = { from, to, body: fullText };

  // Twilio WhatsApp limits body to 1600 chars when media is attached.
  // If text is too long, send image as a separate follow-up message.
  if (mediaUrl && fullText.length <= 1600) {
    messagePayload.mediaUrl = [mediaUrl];
  }

  const message = await twilioClient.messages.create(messagePayload);

  console.log(`✅ Sent! Message SID: ${message.sid}`);

  // Send image separately if text was too long
  if (mediaUrl && fullText.length > 1600) {
    console.log('📎 Text too long for combined send — sending image separately...');
    const imgMsg = await twilioClient.messages.create({
      from, to,
      body: '🖼️',
      mediaUrl: [mediaUrl],
    });
    console.log(`✅ Image sent! SID: ${imgMsg.sid}`);
  }

  console.log('   Check your WhatsApp now!\n');
}

main()
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
