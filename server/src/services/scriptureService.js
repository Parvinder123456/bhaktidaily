'use strict';

const db = require('../config/db');
const contentLogService = require('./contentLogService');

/**
 * Returns a random verse matching the given tag.
 * @param {string} tag
 * @returns {Promise<object|null>}
 */
async function getVerseByTag(tag) {
  if (!tag) return null;

  // PostgreSQL array contains operator
  const verses = await db.scripture.findMany({
    where: {
      tags: {
        has: tag,
      },
    },
  });

  if (!verses || verses.length === 0) return null;

  const index = Math.floor(Math.random() * verses.length);
  return verses[index];
}

/**
 * Returns a verse by its database ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getVerseById(id) {
  if (!id) return null;
  return db.scripture.findUnique({ where: { id } });
}

/**
 * Returns a completely random verse from the database.
 * @returns {Promise<object>}
 */
async function getRandomVerse() {
  const count = await db.scripture.count();
  if (count === 0) throw new Error('No scriptures in database. Run seed:scriptures first.');

  const skip = Math.floor(Math.random() * count);
  const verses = await db.scripture.findMany({ take: 1, skip });
  return verses[0];
}

/**
 * Returns the list of all distinct tags across all scriptures.
 * @returns {Promise<string[]>}
 */
async function getAllTags() {
  const verses = await db.scripture.findMany({
    select: { tags: true },
  });

  const tagSet = new Set();
  for (const verse of verses) {
    for (const tag of verse.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Get a verse the user hasn't seen in the last 60 days.
 * Falls back to least-recently-seen if all verses exhausted.
 * @param {string} userId
 * @returns {Promise<object>} Prisma Scripture object
 */
async function getVerseForUser(userId) {
  const seenIds = await contentLogService.getSeenContentIds(userId, 'verse', 60);

  // Try to find a verse not in the seen list
  const verse = await db.scripture.findFirst({
    where: {
      id: { notIn: seenIds.length > 0 ? seenIds : ['__none__'] },
    },
    orderBy: { createdAt: 'asc' }, // oldest unseen first (predictable rotation)
  });

  if (verse) return verse;

  // Fallback: all verses seen — pick the one seen longest ago
  const oldestLog = await db.contentLog.findFirst({
    where: { userId, contentType: 'verse' },
    orderBy: { date: 'asc' },
  });

  if (oldestLog?.contentId) {
    const fallback = await db.scripture.findUnique({ where: { id: oldestLog.contentId } });
    if (fallback) return fallback;
  }

  // Final fallback: pure random (no logs at all, or content was deleted)
  return getRandomVerse();
}

module.exports = {
  getVerseByTag,
  getVerseById,
  getRandomVerse,
  getVerseForUser,
  getAllTags,
};
