'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  const scripturesDir = path.join(__dirname, '../data/scriptures');
  const files = fs.readdirSync(scripturesDir).filter(f => f.endsWith('.json'));

  let totalSeeded = 0;
  let totalSkipped = 0;
  const errors = [];

  for (const file of files) {
    const filePath = path.join(scripturesDir, file);
    const verses = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`Processing ${file} — ${verses.length} verses`);

    for (const verse of verses) {
      try {
        await prisma.scripture.upsert({
          where: {
            source_reference: {
              source: verse.source,
              reference: verse.reference,
            },
          },
          update: {
            textSanskrit: verse.textSanskrit || null,
            textEnglish: verse.textEnglish,
            textHindi: verse.textHindi || null,
            tags: verse.tags,
            category: verse.category || null,
          },
          create: {
            source: verse.source,
            reference: verse.reference,
            textSanskrit: verse.textSanskrit || null,
            textEnglish: verse.textEnglish,
            textHindi: verse.textHindi || null,
            tags: verse.tags,
            category: verse.category || null,
          },
        });
        totalSeeded++;
      } catch (err) {
        errors.push({ reference: verse.reference, error: err.message });
        console.error(`  Error seeding "${verse.reference}": ${err.message}`);
      }
    }
  }

  console.log(`\nSeeded ${totalSeeded} verses successfully`);
  if (totalSkipped > 0) {
    console.log(`Skipped ${totalSkipped} verses`);
  }
  if (errors.length > 0) {
    console.error(`Errors: ${errors.length}`);
    errors.forEach(e => console.error(`  - ${e.reference}: ${e.error}`));
    process.exit(1);
  }
}

seed()
  .catch(err => {
    console.error('Seed script failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
