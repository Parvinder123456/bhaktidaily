'use strict';

/**
 * Media Controller — CRUD for MediaConfig table.
 *
 * Routes (all require JWT via the /api router middleware):
 *   GET    /api/media        → listMedia     — return all MediaConfig records
 *   POST   /api/media        → upsertMedia   — create or update by key
 *   DELETE /api/media/:key   → deleteMedia   — remove a MediaConfig record
 */

const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * GET /api/media
 * Returns all MediaConfig records ordered by key.
 */
async function listMedia(req, res) {
  const records = await db.mediaConfig.findMany({
    orderBy: { key: 'asc' },
  });
  res.json({ media: records });
}

/**
 * POST /api/media
 * Upserts a MediaConfig record by key.
 * Body: { key, url, type, label }
 */
async function upsertMedia(req, res) {
  const { key, url, type, label } = req.body;

  if (!key || !url || !type || !label) {
    return res.status(400).json({ error: 'key, url, type, and label are required.' });
  }

  const validTypes = ['audio', 'image'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}.` });
  }

  const record = await db.mediaConfig.upsert({
    where: { key },
    update: { url, type, label },
    create: { key, url, type, label },
  });

  logger.info({ message: 'MediaConfig upserted', key });
  res.json({ media: record });
}

/**
 * DELETE /api/media/:key
 * Removes a MediaConfig record by key.
 */
async function deleteMedia(req, res) {
  const { key } = req.params;

  // Check existence first so we return a clear 404 rather than a Prisma error
  const existing = await db.mediaConfig.findUnique({ where: { key } });
  if (!existing) {
    return res.status(404).json({ error: `No MediaConfig found for key "${key}".` });
  }

  await db.mediaConfig.delete({ where: { key } });

  logger.info({ message: 'MediaConfig deleted', key });
  res.json({ success: true, key });
}

module.exports = { listMedia, upsertMedia, deleteMedia };
