'use strict';

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seedNavratri2026() {
  const dataPath = path.join(__dirname, '../../data/festivals/navratri_2026.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  console.log(`Seeding festival: ${data.name}`);

  // Check if already seeded
  const existing = await prisma.festivalCampaign.findFirst({
    where: { name: data.name },
  });

  if (existing) {
    console.log(`Festival "${data.name}" already exists — skipping`);
    return;
  }

  // Create campaign with all days
  const campaign = await prisma.festivalCampaign.create({
    data: {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: true,
      days: {
        create: data.days.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          content: day.content,
        })),
      },
    },
    include: { days: true },
  });

  console.log(`Seeded "${campaign.name}" with ${campaign.days.length} days`);
}

async function main() {
  try {
    await seedNavratri2026();
  } catch (err) {
    console.error('Festival seed error:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

// Allow running directly or importing
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedNavratri2026 };
