'use strict';

/**
 * Admin API Routes — Self-Improvement Intelligence Layer
 *
 * All routes require authentication (JWT middleware applied in app.js).
 * These endpoints power the dashboard intelligence widgets.
 *
 * Routes:
 *   GET /api/admin/content/pool-levels       → ContentPool gauge data
 *   GET /api/admin/prompt/today              → Today's lens + active user count
 *   GET /api/admin/calendar/thisweek         → Next 7 days of Hindu calendar events
 *   GET /api/admin/engagement/distribution   → User tier distribution
 *   GET /api/admin/variants/performance      → A/B test variant stats
 *   GET /api/admin/theme/current             → This week's narrative theme
 *   GET /api/admin/insights/latest           → Latest InsightReport
 */

const express = require('express');
const router = express.Router();

const { getPoolLevels } = require('../services/contentPoolService');
const { getLensForDate, getAllLenses } = require('../services/raashifalLensService');
const { getCalendarContext } = require('../services/calendarService');
const { getEngagementDistribution } = require('../services/engagementService');
const { getVariantPerformance } = require('../services/variantService');
const { getArcBeat, TWELVE_WEEK_CYCLE } = require('../jobs/weeklyThemeJob');
const { handleUpload } = require('../controllers/uploadController');
const dailyMessageService = require('../services/dailyMessageService');
const { sendWhatsAppMessage } = require('../services/messageRouterService');
const db = require('../config/db');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// File Upload (must be before any JSON-only body parsers)
// ---------------------------------------------------------------------------
router.post('/upload', handleUpload);

// ---------------------------------------------------------------------------
// S1-T6: Content Pool Levels
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/content/pool-levels
 * Returns pool level statistics for trivia, facts, and chaupais.
 */
router.get('/content/pool-levels', async (req, res) => {
  try {
    const levels = await getPoolLevels();
    res.json(levels);
  } catch (err) {
    logger.error({ message: 'GET /admin/content/pool-levels failed', error: err.message });
    res.status(500).json({ error: 'Failed to fetch pool levels' });
  }
});

// ---------------------------------------------------------------------------
// S2-T5: Today's Prompt Variation Info
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/prompt/today
 * Returns today's raashifal lens and active user count.
 */
router.get('/prompt/today', async (req, res) => {
  try {
    const now = new Date();
    const lens = getLensForDate(now);
    const activeUserCount = await db.user.count({ where: { isOnboarded: true } });

    res.json({
      lens: {
        key: lens.key,
        label: lens.label,
        description: lens.inject,
      },
      scenarioSampleSize: 50,
      activeUserCount,
    });
  } catch (err) {
    logger.error({ message: 'GET /admin/prompt/today failed', error: err.message });
    res.status(500).json({ error: 'Failed to fetch prompt variation data' });
  }
});

// ---------------------------------------------------------------------------
// S3-T5: Calendar Widget
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/calendar/thisweek
 * Returns next 7 days of Hindu calendar events.
 */
router.get('/calendar/thisweek', async (req, res) => {
  try {
    const events = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dayEvents = await db.hinduCalendarEvent.findMany({
        where: { date },
        orderBy: { eventType: 'asc' },
      });

      events.push({
        date: date.toISOString().split('T')[0],
        events: dayEvents,
      });
    }

    res.json(events);
  } catch (err) {
    logger.error({ message: 'GET /admin/calendar/thisweek failed', error: err.message });
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// ---------------------------------------------------------------------------
// S3-T5: Engagement Distribution
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/engagement/distribution
 * Returns count of users per engagement tier.
 */
router.get('/engagement/distribution', async (req, res) => {
  try {
    const distribution = await getEngagementDistribution();
    res.json(distribution);
  } catch (err) {
    logger.error({ message: 'GET /admin/engagement/distribution failed', error: err.message });
    res.status(500).json({ error: 'Failed to fetch engagement distribution' });
  }
});

// ---------------------------------------------------------------------------
// S4-T5: A/B Variant Performance
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/variants/performance
 * Returns A/B test performance stats for all active bhagwan_sandesh variants.
 */
router.get('/variants/performance', async (req, res) => {
  try {
    const featureKey = req.query.featureKey || 'bhagwan_sandesh';
    const variants = await getVariantPerformance(featureKey);

    // Find last rotation info from logs (best effort)
    const lastRotationLog = await db.jobRunLog.findFirst({
      where: { jobName: 'variantRotation', status: 'completed' },
      orderBy: { finishedAt: 'desc' },
      select: { finishedAt: true, result: true },
    }).catch(() => null);

    res.json({
      variants,
      lastRotation: lastRotationLog?.finishedAt || null,
      usersMoved: lastRotationLog?.result?.moved || 0,
    });
  } catch (err) {
    logger.error({ message: 'GET /admin/variants/performance failed', error: err.message });
    res.status(500).json({ error: 'Failed to fetch variant performance' });
  }
});

// ---------------------------------------------------------------------------
// S4-T5: Weekly Theme Card
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/theme/current
 * Returns current week's narrative theme and today's arc beat.
 */
router.get('/theme/current', async (req, res) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const arcBeat = getArcBeat(dayOfWeek);

    // Get the most common theme assigned this week (representative sample)
    const recentTheme = await db.weeklyTheme.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        themeSanskrit: true,
        themeEnglish: true,
        teaching: true,
        cycleWeek: true,
        cycle: true,
      },
    });

    if (!recentTheme) {
      // Fallback to week 1 if no themes assigned yet
      const week1 = TWELVE_WEEK_CYCLE[0];
      return res.json({
        themeSanskrit: week1.themeSanskrit,
        themeEnglish: week1.themeEnglish,
        teaching: week1.teaching,
        arcBeat: arcBeat.beat,
        arcInstruction: arcBeat.instruction,
        cycleWeek: 1,
        cycle: 1,
      });
    }

    res.json({
      themeSanskrit: recentTheme.themeSanskrit,
      themeEnglish: recentTheme.themeEnglish,
      teaching: recentTheme.teaching,
      arcBeat: arcBeat.beat,
      arcInstruction: arcBeat.instruction,
      cycleWeek: recentTheme.cycleWeek,
      cycle: recentTheme.cycle,
    });
  } catch (err) {
    logger.error({ message: 'GET /admin/theme/current failed', error: err.message });
    res.status(500).json({ error: 'Failed to fetch theme data' });
  }
});

// ---------------------------------------------------------------------------
// S5: Latest Insight Report
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/insights/latest
 * Returns the most recent AI-generated product intelligence report.
 */
router.get('/insights/latest', async (req, res) => {
  try {
    const report = await db.insightReport.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      return res.json({ report: null, message: 'No reports generated yet. Run insightReportJob to generate.' });
    }

    res.json({ report });
  } catch (err) {
    logger.error({ message: 'GET /admin/insights/latest failed', error: err.message });
    res.status(500).json({ error: 'Failed to fetch insight report' });
  }
});

// ---------------------------------------------------------------------------
// Pool content management (for admin dashboard)
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/content/pool
 * List pool items with filtering by type and verification status.
 */
router.get('/content/pool', async (req, res) => {
  try {
    const { type, verified, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;
    if (verified !== undefined) where.verified = verified === 'true';

    const [items, total] = await Promise.all([
      db.contentPool.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10),
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      }),
      db.contentPool.count({ where }),
    ]);

    res.json({ items, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    logger.error({ message: 'GET /admin/content/pool failed', error: err.message });
    res.status(500).json({ error: 'Failed to list content pool' });
  }
});

/**
 * PATCH /api/admin/content/pool/:id/verify
 * Approve or reject a content pool item.
 */
router.patch('/content/pool/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body; // boolean

    const update = approved
      ? { verified: true }
      : { verified: false, isActive: false, rejectedAt: new Date() };

    const item = await db.contentPool.update({ where: { id }, data: update });
    res.json({ item, action: approved ? 'approved' : 'rejected' });
  } catch (err) {
    logger.error({ message: 'PATCH /admin/content/pool/:id/verify failed', error: err.message });
    res.status(500).json({ error: 'Failed to verify content pool item' });
  }
});

// ---------------------------------------------------------------------------
// Test Message — send an on-demand daily message to any phone with any prefs
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/test-message
 * Body: { phone: string, rashi?: string, language?: string }
 *
 * Generates a daily message using the given preferences and sends it via
 * WhatsApp immediately. The user does NOT need to exist in the database —
 * a synthetic user object is built from the supplied preferences.
 *
 * Returns: { sent: true, preview: string }
 */
router.post('/test-message', async (req, res) => {
  try {
    const { phone, rashi = 'Mesh', language = 'en' } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'phone is required' });
    }

    // Normalise phone: ensure it starts with '+'
    const normalisedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Build a synthetic user so we can call generateDailyMessage without a real DB row.
    // We look up the real user first (to get their id for history-aware verse selection),
    // and fall back to a mock object if they don't exist yet.
    const realUser = await db.user.findFirst({ where: { phone: normalisedPhone } });

    const userForGeneration = realUser || {
      id: `test-${Date.now()}`,
      phone: normalisedPhone,
      name: 'Test User',
      rashi,
      language,
      deliveryTime: '07:00',
      timezone: 'Asia/Kolkata',
      isOnboarded: true,
      isPremium: false,
      streakCount: 0,
      engagementProfile: null,
      contentCycleWeek: 0,
      lastThemeTag: null,
    };

    // Override prefs with what admin requested
    userForGeneration.rashi = rashi;
    userForGeneration.language = language;

    const { fullText } = await dailyMessageService.generateDailyMessage(userForGeneration);

    // Fetch optional daily_image
    let mediaUrl = null;
    try {
      const imgConfig = await db.mediaConfig.findUnique({ where: { key: 'daily_image' } });
      if (imgConfig?.url) mediaUrl = imgConfig.url;
    } catch (_) { /* non-fatal */ }

    await sendWhatsAppMessage(normalisedPhone, fullText, mediaUrl);

    logger.info({ message: 'Admin test message sent', phone: normalisedPhone, rashi, language });
    res.json({ sent: true, preview: fullText });
  } catch (err) {
    logger.error({ message: 'POST /admin/test-message failed', error: err.message });
    res.status(500).json({ error: err.message || 'Failed to send test message' });
  }
});

// ---------------------------------------------------------------------------
// Tool Leads — Analytics & Management
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/tools/leads
 * Query: { toolName?, converted?, page?, limit?, from?, to? }
 */
router.get('/tools/leads', async (req, res) => {
  try {
    const { toolName, converted, page = 1, limit = 25, from, to } = req.query;
    const where = {};
    if (toolName) where.toolName = toolName;
    if (converted !== undefined) where.converted = converted === 'true';
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [leads, total] = await Promise.all([
      db.toolLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      }),
      db.toolLead.count({ where }),
    ]);

    res.json({ leads, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    logger.error({ message: 'GET /tools/leads error', error: err.message });
    res.status(500).json({ error: 'Could not fetch leads' });
  }
});

/**
 * GET /api/admin/tools/stats
 * Returns aggregated stats: total leads, per-tool breakdown, conversion rates.
 */
router.get('/tools/stats', async (req, res) => {
  try {
    const [total, converted, byTool] = await Promise.all([
      db.toolLead.count(),
      db.toolLead.count({ where: { converted: true } }),
      db.toolLead.groupBy({
        by: ['toolName'],
        _count: true,
      }),
    ]);

    const toolStats = await Promise.all(
      byTool.map(async (t) => {
        const toolConverted = await db.toolLead.count({
          where: { toolName: t.toolName, converted: true },
        });
        return {
          toolName: t.toolName,
          totalLeads: t._count,
          converted: toolConverted,
          conversionRate: t._count > 0
            ? ((toolConverted / t._count) * 100).toFixed(1) + '%'
            : '0%',
        };
      })
    );

    res.json({
      totalLeads: total,
      totalConverted: converted,
      overallConversionRate: total > 0
        ? ((converted / total) * 100).toFixed(1) + '%'
        : '0%',
      byTool: toolStats,
    });
  } catch (err) {
    logger.error({ message: 'GET /tools/stats error', error: err.message });
    res.status(500).json({ error: 'Could not fetch tool stats' });
  }
});

module.exports = router;
