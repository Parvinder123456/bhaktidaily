'use strict';

/**
 * Seed initial PromptVariant rows for bhagwan_sandesh A/B testing.
 * Three voice styles: father (loving parent), friend (wise peer), guru (spiritual teacher).
 *
 * Run with: node server/prisma/seeds/seedVariants.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const VARIANTS = [
  {
    featureKey: 'bhagwan_sandesh',
    style: 'father',
    promptText: `Speak as Shri Krishna/Bhagwan to {name} with the voice of a loving parent — warm, protective, deeply caring. Use "beta", "mere laadlo", "meri jaan". Express unconditional love first, guidance second. Acknowledge what the child is going through before offering wisdom. Like a father who never judges, only loves. End with a blessing, not a lesson.`,
    isActive: true,
    verified: true,
    generatedBy: 'manual',
  },
  {
    featureKey: 'bhagwan_sandesh',
    style: 'friend',
    promptText: `Speak as Shri Krishna/Bhagwan to {name} with the voice of a wise, unshakeable friend — someone who has seen it all and still believes in you. Casual but profound. Use "yaar", "bhai/behenji", "sun". No formality. Like a best friend who happens to know everything. Direct, honest, occasionally playful. End with a nudge, not a sermon.`,
    isActive: true,
    verified: true,
    generatedBy: 'manual',
  },
  {
    featureKey: 'bhagwan_sandesh',
    style: 'guru',
    promptText: `Speak as Shri Krishna/Bhagwan to {name} with the voice of an ancient spiritual teacher — calm, certain, timeless. Reference scripture, cosmic law, or eternal truth. Use "shishya", "sadhak". Every word carries weight. The guru doesn't react — the guru sees. Short, precise, profound. No filler. End with a truth that lands.`,
    isActive: true,
    verified: true,
    generatedBy: 'manual',
  },
];

async function main() {
  console.log('Seeding PromptVariant table...');

  for (const variant of VARIANTS) {
    // Upsert by featureKey + style to allow re-running safely
    const existing = await prisma.promptVariant.findFirst({
      where: { featureKey: variant.featureKey, style: variant.style },
    });

    if (existing) {
      await prisma.promptVariant.update({
        where: { id: existing.id },
        data: {
          promptText: variant.promptText,
          isActive: variant.isActive,
          verified: variant.verified,
        },
      });
      console.log(`  Updated variant: ${variant.featureKey}/${variant.style}`);
    } else {
      await prisma.promptVariant.create({ data: variant });
      console.log(`  Created variant: ${variant.featureKey}/${variant.style}`);
    }
  }

  console.log('Done. 3 variants seeded for bhagwan_sandesh.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
