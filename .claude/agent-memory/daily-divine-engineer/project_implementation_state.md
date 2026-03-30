---
name: Self-Improvement Layer Implementation State
description: Status of all self-improvement backend tasks implemented on 2026-03-30
type: project
---

Implemented the full backend self-improvement system (Sprints 1-5 backend tasks) on 2026-03-30.

**Why:** Engineering plan called for an AI self-improvement layer to make Daily Dharma's content adaptive, personalised, and analytically driven instead of a static one-way pipeline.

**What was built:**

## Schema (server/prisma/schema.prisma)
Added: ContentLog, ContentPool, HinduCalendarEvent, PromptVariant, UserPromptVariant, WeeklyTheme, InsightReport, PromptErrorLog, JobRunLog models. Also added engagementProfile (Json), contentCycleWeek (Int), lastThemeTag (String) to User model.

CRITICAL: Migration NOT yet run. Run: `cd server && npx prisma migrate dev --name add_self_improvement_layer`

## New Services (server/src/services/)
- contentLogService.js — logs every content sent, marks replies, weighted selection
- contentPoolService.js — manages ContentPool table (pick, score, mark used)
- raashifalLensService.js — 6-lens rotation by day of year (deterministic)
- scenarioSeedService.js — 50 micro-scenario seeds, deterministic hash by userId+date
- calendarService.js — day deities, ritu seasons, DB calendar events
- engagementService.js — computes user tiers (high/medium/low by reply rate), tone injections
- variantService.js — A/B variant assignment (load-balanced), reply rate tracking

## New Jobs (server/src/jobs/)
- contentGenerationJob.js — Sunday 11PM IST, Gemini Pro generates trivia/facts/chaupais
- calendarSeedJob.js — Sunday 10PM IST, seeds 7 days of calendar events (no AI)
- engagementUpdateJob.js — daily 3AM IST, batch-updates all user engagement profiles
- variantRotationJob.js — Monday 5AM IST, moves 20% worst variant users to best
- weeklyThemeJob.js — Sunday 11:30PM IST, assigns 12-week narrative cycle themes
- insightReportJob.js — Monday 6AM IST, Gemini Pro weekly product intelligence report

## Queue Changes
- server/src/config/queues.js: added getIntelligenceQueue(), 6 new JOB_NAMES constants
- server/src/jobs/index.js: intelligenceWorker created, 6 repeatable jobs registered

## Integration Points
- dailyMessageService.js: now calls all personalization services (lens, seed, calendar, tone, variant, weekly theme) and logs to ContentLog
- messageRouterService.js: calls contentLogService.markReplyAll() on inbound messages
- scriptureService.js: added getVerseForUser(userId) for 60-day dedup history

## Prompt Changes
- server/src/prompts/daily_v2.txt: added 8 new injection slots
- server/src/services/promptService.js: buildDailyPromptV2 handles all new vars

## Admin API
- server/src/routes/admin.js: 8 endpoints for dashboard widgets (pool levels, lens today, calendar, engagement dist, variants, theme, insights, pool management)
- Mounted at /api/admin in app.js

## Seed Scripts
- server/prisma/seeds/seedVariants.js: 3 bhagwan_sandesh variants (father/friend/guru)
  Run after migration: `node server/prisma/seeds/seedVariants.js`

## Dashboard Frontend Components (built 2026-03-30)
All 6 intelligence widgets built and verified with `next build` (zero errors):
- dashboard/src/components/ContentPoolCard.jsx — pool gauges, wired to /api/admin/content/pool-levels
- dashboard/src/components/PromptVariationCard.jsx — lens chip + stats, wired to /api/admin/prompt/today
- dashboard/src/components/CalendarWidget.jsx — 7-day event list, wired to /api/admin/calendar/thisweek
- dashboard/src/components/EngagementHeatmap.jsx — tier stacked bar, wired to /api/admin/engagement/distribution
- dashboard/src/components/ABTestingCard.jsx — winner banner + rate bars, wired to /api/admin/variants/performance
- dashboard/src/components/WeeklyThemeCard.jsx — 12-dot cycle progress, wired to /api/admin/theme/current
- dashboard/src/app/admin/page.jsx — admin intelligence dashboard page at /admin
- dashboard/.eslintrc.json — added (was missing, caused build failure for all JSX files)
- dashboard/src/lib/api.js — added 7 admin API helper methods
- Admin link added to main user nav (dashboard/src/app/dashboard/page.jsx)

UI patterns: glass-card class, dark saffron/gold theme (#FF9933 / #FFD700), inline styles object pattern, Yatra One heading font, each component owns its own fetch with loading/error states.

## Still Pending
- S1-T7: ContentLogBadge on history page
- S5: InsightReportCard (GET /api/admin/insights/latest)
- JobRunLog population from worker events (server/src/jobs/index.js)
- Prisma migration must be run before anything works in production

**How to apply:** Check engineering_plan.md status table for current state. Always run migration before testing.
