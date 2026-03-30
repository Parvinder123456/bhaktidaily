'use strict';

const { getClient } = require('../config/gemini');
const db = require('../config/db');
const logger = require('../utils/logger');

const PRO_MODEL = 'gemini-2.5-pro';

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

/**
 * Gather 7-day engagement snapshot for the insight report.
 * @returns {Promise<Object>} Snapshot object
 */
async function gatherEngagementData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  // Total users
  const totalUsers = await db.user.count({ where: { isOnboarded: true } });
  const activeUsers = await db.user.count({
    where: { isOnboarded: true, lastInteraction: { gte: sevenDaysAgo } },
  });

  // Reply rates by content type
  const byContentType = await db.contentLog.groupBy({
    by: ['contentType'],
    where: { date: { gte: sevenDaysAgo } },
    _count: { id: true },
  });

  const contentTypeStats = {};
  for (const row of byContentType) {
    const replies = await db.contentLog.count({
      where: { contentType: row.contentType, date: { gte: sevenDaysAgo }, gotReply: true },
    });
    contentTypeStats[row.contentType] = {
      sent: row._count.id,
      replies,
      replyRate: row._count.id > 0 ? (replies / row._count.id).toFixed(3) : '0.000',
    };
  }

  // Reply rates by rashi
  const users = await db.user.findMany({
    where: { isOnboarded: true, rashi: { not: null } },
    select: { id: true, rashi: true },
  });

  const rashiStats = {};
  for (const user of users) {
    if (!user.rashi) continue;
    if (!rashiStats[user.rashi]) rashiStats[user.rashi] = { sent: 0, replies: 0 };

    const userLogs = await db.contentLog.count({
      where: { userId: user.id, date: { gte: sevenDaysAgo } },
    });
    const userReplies = await db.contentLog.count({
      where: { userId: user.id, date: { gte: sevenDaysAgo }, gotReply: true },
    });

    rashiStats[user.rashi].sent += userLogs;
    rashiStats[user.rashi].replies += userReplies;
  }

  for (const rashi of Object.keys(rashiStats)) {
    const { sent, replies } = rashiStats[rashi];
    rashiStats[rashi].replyRate = sent > 0 ? (replies / sent).toFixed(3) : '0.000';
  }

  // Streak distribution
  const streakBuckets = await db.user.groupBy({
    by: [],
    where: { isOnboarded: true },
    _count: true,
  });

  const streak0 = await db.user.count({ where: { isOnboarded: true, streakCount: 0 } });
  const streak1to7 = await db.user.count({ where: { isOnboarded: true, streakCount: { gte: 1, lte: 7 } } });
  const streak8to30 = await db.user.count({ where: { isOnboarded: true, streakCount: { gte: 8, lte: 30 } } });
  const streak30plus = await db.user.count({ where: { isOnboarded: true, streakCount: { gt: 30 } } });

  // Variant performance
  const variants = await db.promptVariant.findMany({
    where: { isActive: true },
    select: { style: true, featureKey: true, lastReplyRate: true, lastEvaluatedAt: true },
    orderBy: { lastReplyRate: 'desc' },
  });

  return {
    period: {
      from: sevenDaysAgo.toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
    users: { total: totalUsers, active: activeUsers, activeRate: totalUsers > 0 ? (activeUsers / totalUsers).toFixed(3) : '0.000' },
    contentTypeStats,
    rashiStats,
    streakDistribution: {
      zero: streak0,
      oneToSeven: streak1to7,
      eightToThirty: streak8to30,
      thirtyPlus: streak30plus,
    },
    variantPerformance: variants,
  };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

const INSIGHT_PROMPT_TEMPLATE = `You are the AI product analyst for "Daily Dharma", a WhatsApp-based Hindu spiritual companion app with {totalUsers} users.

Here is this week's engagement data:

USERS: {totalUsers} total, {activeUsers} active ({activeRate}% active rate)

CONTENT TYPE REPLY RATES:
{contentTypeStats}

REPLY RATES BY ZODIAC SIGN (RASHI):
{rashiStats}

STREAK DISTRIBUTION:
- No streak: {streak0}
- 1-7 days: {streak17}
- 8-30 days: {streak830}
- 30+ days: {streak30plus}

A/B VARIANT PERFORMANCE:
{variantPerformance}

Based on this data, generate a weekly product intelligence report. Be specific, data-driven, and actionable.

Return ONLY valid JSON (no markdown):
{
  "observations": [
    "specific observation 1 with numbers",
    "specific observation 2 with numbers"
  ],
  "promptChanges": [
    {
      "target": "bhagwan_sandesh|raashifal|daily_message",
      "currentIssue": "what the data shows is wrong",
      "suggestedChange": "specific prompt modification",
      "expectedImpact": "what metric should improve"
    }
  ],
  "featureIdea": {
    "name": "feature name",
    "description": "what to build",
    "rationale": "what data point suggests this",
    "effort": "low|medium|high"
  },
  "alerts": [
    "anything urgent that needs immediate attention"
  ]
}`;

/**
 * Weekly AI product intelligence report.
 * Gathers 7 days of engagement data, sends to Gemini Pro for analysis.
 * Saves report to InsightReport table.
 * @param {Object} job - BullMQ job
 * @returns {Promise<{ reportId: string }>}
 */
async function processInsightReport(job) {
  logger.info({ message: 'insightReportJob started', jobId: job.id });
  const startedAt = Date.now();

  // 1. Gather data
  const data = await gatherEngagementData();

  // 2. Format prompt
  const contentTypeLines = Object.entries(data.contentTypeStats)
    .map(([type, stats]) => `  ${type}: ${stats.sent} sent, ${stats.replies} replies, ${stats.replyRate} rate`)
    .join('\n');

  const rashiLines = Object.entries(data.rashiStats)
    .sort((a, b) => parseFloat(b[1].replyRate) - parseFloat(a[1].replyRate))
    .map(([rashi, stats]) => `  ${rashi}: ${stats.replyRate} reply rate (${stats.sent} sent)`)
    .join('\n');

  const variantLines = data.variantPerformance
    .map(v => `  ${v.featureKey}/${v.style}: ${(v.lastReplyRate || 0).toFixed(3)} reply rate`)
    .join('\n');

  const prompt = INSIGHT_PROMPT_TEMPLATE
    .replace('{totalUsers}', String(data.users.total))
    .replace('{activeUsers}', String(data.users.active))
    .replace('{activeRate}', String(Math.round(parseFloat(data.users.activeRate) * 100)))
    .replace('{contentTypeStats}', contentTypeLines || '  No data yet')
    .replace('{rashiStats}', rashiLines || '  No data yet')
    .replace('{streak0}', String(data.streakDistribution.zero))
    .replace('{streak17}', String(data.streakDistribution.oneToSeven))
    .replace('{streak830}', String(data.streakDistribution.eightToThirty))
    .replace('{streak30plus}', String(data.streakDistribution.thirtyPlus))
    .replace('{variantPerformance}', variantLines || '  No variants active');

  // 3. Call Gemini Pro
  let reportData;
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: PRO_MODEL });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    reportData = JSON.parse(cleaned);
  } catch (err) {
    logger.error({ message: 'Gemini Pro insight generation failed', error: err.message });
    reportData = {
      observations: ['Gemini Pro call failed — check logs'],
      promptChanges: [],
      featureIdea: { name: 'N/A', description: '', rationale: '', effort: 'low' },
      alerts: [`Report generation failed: ${err.message}`],
    };
  }

  // 4. Save report to DB
  const period = `${data.period.from} to ${data.period.to}`;
  const report = await db.insightReport.create({
    data: {
      period,
      rawData: data,
      observations: reportData.observations || [],
      promptChanges: reportData.promptChanges || [],
      featureIdea: reportData.featureIdea || {},
      alerts: reportData.alerts || [],
      model: PRO_MODEL,
    },
  });

  const duration = Date.now() - startedAt;
  logger.info({
    message: 'insightReportJob completed',
    jobId: job.id,
    reportId: report.id,
    period,
    durationMs: duration,
    observationCount: (reportData.observations || []).length,
    alertCount: (reportData.alerts || []).length,
  });

  return { reportId: report.id };
}

module.exports = { processInsightReport };
