'use strict';

/**
 * Content quality tester — no WhatsApp, no Twilio needed.
 * Seeds a test user, generates daily message + all 7 bonus types, prints to console.
 *
 * Usage:
 *   node scripts/test-content.js
 *   node scripts/test-content.js --only daily
 *   node scripts/test-content.js --only bonus
 *   node scripts/test-content.js --rashi Mesh --name Rahul
 */

const path = require('path');
const SERVER_DIR = path.join(__dirname, '../server');

require('dotenv').config({ path: path.join(SERVER_DIR, '.env') });

const dailyMessageService = require(path.join(SERVER_DIR, 'src/services/dailyMessageService'));
const bonusMessageService = require(path.join(SERVER_DIR, 'src/services/bonusMessageService'));

// Parse CLI args
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const rashiArg = args.includes('--rashi') ? args[args.indexOf('--rashi') + 1] : 'Mesh';
const nameArg = args.includes('--name') ? args[args.indexOf('--name') + 1] : 'Rahul';

// Fake user — no DB needed
const TEST_USER = {
  id: 'test-user-001',
  phone: '+919999999999',
  name: nameArg,
  rashi: rashiArg,
  language: 'hinglish',
  streakCount: 14,
  isOnboarded: true,
  pendingInteraction: null,
};

function divider(title) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

async function testDailyMessage() {
  divider('📩 DAILY MESSAGE (6 AM)');
  try {
    const { fullText } = await dailyMessageService.generateDailyMessage(TEST_USER);
    console.log(fullText);
  } catch (err) {
    console.error('❌ Daily message failed:', err.message);
  }
}

async function testBonusMessages() {
  const bonusTests = [
    {
      label: '🧠 MONDAY — Trivia Question (12 PM)',
      fn: () => bonusMessageService.getMondayTriviaQuestion(TEST_USER),
    },
    {
      label: '📢 MONDAY — Trivia Answer Reveal (6 PM)',
      fn: () => bonusMessageService.getMondayTriviaAnswer(TEST_USER.id),
    },
    {
      label: '🔱 TUESDAY — Hanuman Special (8 AM)',
      fn: () => bonusMessageService.getTuesdayHanumanSpecial(),
    },
    {
      label: '🌙 WEDNESDAY — Dream Prompt (8 AM)',
      fn: () => bonusMessageService.getWednesdayDreamPrompt(TEST_USER),
    },
    {
      label: '🧐 THURSDAY — Kya Aap Jaante The? (8 AM)',
      fn: () => bonusMessageService.getThursdayFact(),
    },
    {
      label: '✨ FRIDAY — Naam Ka Rahasya (8 AM)',
      fn: () => bonusMessageService.getFridayNaamPrompt(TEST_USER),
    },
    {
      label: '🪐 SATURDAY — Shani + Leaderboard (8 AM)',
      fn: () => bonusMessageService.getSaturdayShaniLeaderboard(),
    },
    {
      label: '🙏 SUNDAY — Bhagwan Se Poochhein (8 AM)',
      fn: () => bonusMessageService.getSundayQAPrompt(TEST_USER),
    },
  ];

  for (const test of bonusTests) {
    divider(test.label);
    try {
      const result = await test.fn();
      console.log(result);
    } catch (err) {
      console.error(`❌ Failed: ${err.message}`);
    }
  }
}

async function main() {
  console.log(`\n🧪 Daily Dharma Content Tester`);
  console.log(`   User: ${TEST_USER.name} | Rashi: ${TEST_USER.rashi} | Language: ${TEST_USER.language}`);

  if (!only || only === 'daily') await testDailyMessage();
  if (!only || only === 'bonus') await testBonusMessages();

  console.log('\n\n✅ Done!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
