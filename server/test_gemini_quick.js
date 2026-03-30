require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const dailyMessageService = require('./src/services/dailyMessageService');

const prisma = new PrismaClient();
const twilio = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function main() {
  const user = await prisma.user.findFirst({ where: { isOnboarded: true } });
  if (!user) { console.log('No onboarded user found'); return; }

  console.log('User:', user.name, user.phone, user.rashi);

  console.log('\nGenerating daily message...');
  const { fullText } = await dailyMessageService.generateDailyMessage(user);
  
  console.log('\n' + '='.repeat(60));
  console.log(fullText);
  console.log('='.repeat(60));
  console.log('\nWord count:', fullText.split(' ').length);

  console.log('\nSending via WhatsApp...');
  try {
    const msg = await twilio.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${user.phone}`,
      body: fullText,
    });
    console.log('SENT! SID:', msg.sid);
  } catch (e) {
    console.log('TWILIO ERROR:', e.message);
    console.log('CODE:', e.code);
    console.log('STATUS:', e.status);
  }
}

main()
  .catch(e => console.error('FATAL:', e.message))
  .finally(() => prisma.$disconnect());
