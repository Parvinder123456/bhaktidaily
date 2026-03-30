require('dotenv').config({ path: './server/.env' });
const { routeMessage } = require('./server/src/services/messageRouterService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst({ where: { isOnboarded: true } });
    const res = await routeMessage(user.phone, 'What is Karma?');
    console.log('REPLY LENGTH:', res.replyText.length);
  } catch (e) {
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

test();
