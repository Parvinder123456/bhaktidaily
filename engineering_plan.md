# Daily Dharma — Self-Improvement System Engineering Plan

> **Purpose:** Implementation blueprint for an AI coding agent or developer to execute. Every task specifies exact file paths, function signatures, schema changes, job configurations, and acceptance criteria. No ambiguity.
>
> **Architecture context:** Node.js + Express backend (`server/src/`), Next.js dashboard (`dashboard/src/app/`), PostgreSQL + Prisma ORM (`server/prisma/schema.prisma`), BullMQ + Redis queues, Twilio WhatsApp, Google Gemini API.

---

## Implementation Status (Last updated: 2026-03-30 — 6 frontend intelligence widgets built)

### Completed Backend Tasks

| Task | Status | Notes |
|------|--------|-------|
| S1-T1: Prisma schema (ContentLog, ContentPool, User fields, + Sprint 3-5 models) | DONE | Schema validated. Run `prisma migrate dev` to apply. |
| S1-T2: contentLogService.js | DONE | `server/src/services/contentLogService.js` |
| S1-T3: scriptureService.js — getVerseForUser() | DONE | Added to existing file |
| S1-T4: contentPoolService.js | DONE | `server/src/services/contentPoolService.js` |
| S1-T5: contentGenerationJob.js + intelligenceQueue in queues.js | DONE | `server/src/jobs/contentGenerationJob.js` |
| S2-T1: raashifalLensService.js | DONE | `server/src/services/raashifalLensService.js` |
| S2-T2: scenarioSeedService.js + data/scenarioSeeds.json | DONE | 50 seeds in `server/src/data/scenarioSeeds.json` |
| S2-T3: daily_v2.txt prompt template — new slots | DONE | `{raashifalLens}`, `{raashifalLensInstruction}`, `{scenarioSeed}` added |
| S2-T4: dailyMessageService.js — inject lens + seed + ContentLog | DONE | Lens, seed, ContentLog all wired |
| S3-T2: calendarService.js + calendarSeedJob.js | DONE | `server/src/services/calendarService.js`, `server/src/jobs/calendarSeedJob.js` |
| S3-T3: engagementService.js | DONE | `server/src/services/engagementService.js` |
| S3-T4: engagementUpdateJob.js | DONE | `server/src/jobs/engagementUpdateJob.js` |
| S4-T1: Schema for PromptVariant, UserPromptVariant, WeeklyTheme (+ seeds) | DONE | Schema done; seed at `server/prisma/seeds/seedVariants.js` |
| S4-T2: variantService.js | DONE | `server/src/services/variantService.js` |
| S4-T3: variantRotationJob.js | DONE | `server/src/jobs/variantRotationJob.js` |
| S4-T4: weeklyThemeJob.js | DONE | `server/src/jobs/weeklyThemeJob.js`, 12-week cycle embedded |
| S5-T1: InsightReport, PromptErrorLog, JobRunLog schema | DONE | In schema, needs migration |
| S5-T2: insightReportJob.js | DONE | `server/src/jobs/insightReportJob.js` |
| jobs/index.js — intelligenceWorker + all repeatable jobs | DONE | All 6 intelligence jobs registered |
| routes/admin.js — all admin API endpoints | DONE | `server/src/routes/admin.js`, mounted in app.js |
| promptService.js — extended buildDailyPromptV2 | DONE | Handles lens/scenario/calendar vars |
| messageRouterService.js — markReplyAll on inbound | DONE | ContentLog engagement tracking wired |

### Pending Tasks

| Task | Status | Notes |
|------|--------|-------|
| **DB Migration** | PENDING | Run `cd server && npx prisma migrate dev --name add_self_improvement_layer` |
| **Variant seed** | PENDING | Run `node server/prisma/seeds/seedVariants.js` after migration |
| **Calendar seed** | PENDING | Trigger calendarSeedJob manually once or wait for Sunday 10PM IST |
| S1-T6: Dashboard — ContentPoolCard | DONE | `dashboard/src/components/ContentPoolCard.jsx` — wired to `/api/admin/content/pool-levels` |
| S1-T7: Dashboard — ContentLogBadge on history | PENDING | Frontend component |
| S2-T5: Dashboard — PromptVariationCard | DONE | `dashboard/src/components/PromptVariationCard.jsx` — wired to `/api/admin/prompt/today` |
| S3-T1: HinduCalendarEvent schema migration note | DONE | In schema, needs migrate |
| S3-T5: Dashboard — CalendarWidget + EngagementHeatmap | DONE | `CalendarWidget.jsx` + `EngagementHeatmap.jsx` — wired to calendar/thisweek + engagement/distribution |
| S4-T5: Dashboard — ABTestingCard + WeeklyThemeCard | DONE | `ABTestingCard.jsx` + `WeeklyThemeCard.jsx` — wired to variants/performance + theme/current |
| Admin dashboard page | DONE | `dashboard/src/app/admin/page.jsx` — integrates all 6 intelligence widgets; linked from main nav |
| ESLint config | DONE | Added `dashboard/.eslintrc.json` with `next/core-web-vitals`; build passes clean |
| S5 dashboard widgets | PENDING | InsightReport display card (`/api/admin/insights/latest`) |
| Calendar injection into dailyMessageService | DONE | getCalendarContext() wired, `{calendarContext}` in prompt |
| Tone injection into dailyMessageService | DONE | getToneInjection() wired, `{toneInstruction}` in prompt |
| Variant prompt in dailyMessageService | DONE | assignVariant() + getVariantPrompt() wired, `{variantPromptInstruction}` in prompt |
| Weekly theme in dailyMessageService | DONE | WeeklyTheme DB lookup + getArcBeat() wired, `{weeklyThemeContext}` in prompt |
| JobRunLog population | PENDING | Add logging hooks to worker completed/failed events in jobs/index.js |

### Next Priority Actions
1. Run Prisma migration: `cd server && npx prisma migrate dev --name add_self_improvement_layer`
2. Run variant seed: `node server/prisma/seeds/seedVariants.js`
3. Build S5 InsightReport display card (`/api/admin/insights/latest`) at `dashboard/src/components/InsightReportCard.jsx`
4. Build S1-T7 ContentLogBadge on the history page
5. Add JobRunLog population hooks in `server/src/jobs/index.js`

---

## Sprint 1 (Week 1): Content Foundation

### S1-T1: Prisma Schema — Add ContentLog, ContentPool, and User Fields

**Files to modify:**
- `server/prisma/schema.prisma`

**Schema additions:**

```prisma
// Add to existing User model — new fields:
//   engagementProfile  Json?
//   contentCycleWeek   Int       @default(0)
//   lastThemeTag       String?
//   contentLogs        ContentLog[]
//   weeklyThemes       WeeklyTheme[]
//   promptVariants     UserPromptVariant[]

model ContentLog {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  contentType String    // verse, trivia, fact, raashifal, bhagwan_sandesh, bonus, streak_recovery
  contentId   String?   // FK to specific content table (nullable for generated content)
  contentTag  String?   // theme tag for preference tracking
  date        DateTime  @db.Date
  gotReply    Boolean   @default(false)
  replyAt     DateTime?
  createdAt   DateTime  @default(now())

  @@index([userId, contentType, date])
  @@index([contentType, gotReply])
  @@index([userId, date])
}

model ContentPool {
  id           String   @id @default(uuid())
  type         String   // fact, hanuman_chaupai, trivia_generated, verse_commentary
  content      String   // main content text or JSON blob
  tags         String[]
  source       String?  // scripture reference or "AI generated"
  generatedBy  String?  // model name that generated this
  qualityScore Float    @default(0)
  usedCount    Int      @default(0)
  isActive     Boolean  @default(true)
  verified     Boolean  @default(true) // false = needs admin approval before going live
  rejectedAt   DateTime?
  createdAt    DateTime @default(now())

  @@index([type, isActive])
  @@index([tags])
  @@index([type, isActive, verified])
}
```

**Migration command:**
```bash
cd server && npx prisma migrate dev --name add_content_log_and_pool
```

**Acceptance criteria:**
- [ ] `npx prisma migrate dev` completes without errors
- [ ] `npx prisma generate` succeeds
- [ ] User model has `engagementProfile`, `contentCycleWeek`, `lastThemeTag` fields
- [ ] `ContentLog` and `ContentPool` tables exist in PostgreSQL
- [ ] Can create/read ContentLog rows via Prisma client in a test script

---

### S1-T2: Create contentLogService.js

**File to create:** `server/src/services/contentLogService.js`

**Functions:**

```javascript
/**
 * Log a piece of content sent to a user.
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.contentType - One of: verse, trivia, fact, raashifal, bhagwan_sandesh, bonus, streak_recovery
 * @param {string|null} params.contentId - FK to source table (null for generated content)
 * @param {string|null} params.contentTag - Theme tag (e.g., "gita", "practical", "temples")
 * @param {Date} params.date - Date of the message (Date object, date-only)
 * @returns {Promise<ContentLog>}
 */
async function logContent({ userId, contentType, contentId, contentTag, date })

/**
 * Mark that a user replied to content on a given date.
 * Called from webhook.js when an inbound message is received.
 * @param {string} userId
 * @param {Date} date - Date to match (date-only)
 * @param {string} contentType - Which content type to mark
 * @returns {Promise<{ count: number }>}
 */
async function markReply(userId, date, contentType)

/**
 * Get IDs of content a user has already seen within the last N days.
 * Used for deduplication.
 * @param {string} userId
 * @param {string} contentType
 * @param {number} days - Lookback window (default 60)
 * @returns {Promise<string[]>} Array of contentId strings
 */
async function getSeenContentIds(userId, contentType, days = 60)

/**
 * Get aggregated quality scores for a content type.
 * Returns contentId -> reply rate mapping.
 * @param {string} contentType
 * @param {number} limit
 * @returns {Promise<Array<{ contentId, totalSent, totalReplies, replyRate }>>}
 */
async function getContentScores(contentType, limit = 50)

/**
 * Pick content using weighted random selection based on reply rates.
 * Higher-performing content is more likely to be picked.
 * @param {string} userId
 * @param {string} contentType
 * @param {Array} candidates - Array of content objects with `id` field
 * @returns {Promise<Object>} Selected content item
 */
async function pickWeightedContent(userId, contentType, candidates)
```

**Integration points:**
- `server/src/services/dailyMessageService.js` — call `logContent()` after every message is sent
- `server/src/routes/webhook.js` (or wherever inbound messages are handled) — call `markReply()` when user replies

**Acceptance criteria:**
- [ ] `logContent()` creates a ContentLog row with all fields populated
- [ ] `markReply()` sets `gotReply = true` and `replyAt` on matching rows
- [ ] `getSeenContentIds()` returns only IDs from the last N days
- [ ] `pickWeightedContent()` favors content with higher reply rates (verify with unit test: content with 50% reply rate is picked >2x more often than 0% over 1000 iterations)

---

### S1-T3: Update scriptureService.js — History-Aware Verse Selection

**File to modify:** `server/src/services/scriptureService.js`

**Changes:**
- Add new function `getVerseForUser(userId)` that replaces any existing `getRandomVerse()` usage
- Uses `contentLogService.getSeenContentIds()` to exclude verses seen in last 60 days
- Fallback: if all verses seen, pick the least-recently-seen verse

**Function signature:**
```javascript
/**
 * Get a verse the user hasn't seen in the last 60 days.
 * Falls back to least-recently-seen if all verses exhausted.
 * @param {string} userId
 * @returns {Promise<Scripture>} Prisma Scripture object
 */
async function getVerseForUser(userId)
```

**Modify callers:**
- In `server/src/services/dailyMessageService.js`, replace any call to `getRandomVerse()` or equivalent with `getVerseForUser(userId)`

**Acceptance criteria:**
- [ ] A user who has received verse ID "abc" yesterday does not receive "abc" again today
- [ ] After receiving all N scriptures, the user gets the one they saw longest ago
- [ ] `contentLogService.logContent()` is called with `contentType: 'verse'` and the verse's ID after selection

---

### S1-T4: Create contentPoolService.js

**File to create:** `server/src/services/contentPoolService.js`

**Functions:**

```javascript
/**
 * Pick a fresh content item from the pool that the user hasn't seen.
 * Uses weighted selection favoring higher quality scores.
 * @param {string} userId
 * @param {string} type - Content type (e.g., "fact", "hanuman_chaupai")
 * @returns {Promise<ContentPool|null>}
 */
async function pickFreshContent(userId, type)

/**
 * Update quality score for a content item based on engagement data.
 * Called periodically or after reply data is collected.
 * @param {string} contentId - ContentPool ID
 * @returns {Promise<ContentPool>}
 */
async function updateQualityScore(contentId)

/**
 * Get pool level statistics for dashboard display.
 * @returns {Promise<{ trivia: { unused, total, lastGenerated }, facts: {...}, chaupais: {...} }>}
 */
async function getPoolLevels()

/**
 * Increment usedCount when content is sent.
 * @param {string} contentId
 * @returns {Promise<ContentPool>}
 */
async function markUsed(contentId)
```

**Acceptance criteria:**
- [ ] `pickFreshContent()` never returns content the user has seen in 60 days
- [ ] `pickFreshContent()` only returns content where `isActive = true` and `verified = true`
- [ ] `getPoolLevels()` returns correct counts (verified against direct SQL count)
- [ ] `markUsed()` increments `usedCount` by 1

---

### S1-T5: Create contentGenerationJob.js

**File to create:** `server/src/jobs/contentGenerationJob.js`

**BullMQ job details:**
- **Job name:** `contentGeneration`
- **Queue:** `intelligenceQueue` (new queue — see queue registration below)
- **Cron:** `0 23 * * 0` (Sunday 11 PM IST)
- **Timezone:** `Asia/Kolkata`
- **Model:** `gemini-2.5-pro`
- **Concurrency:** 1

**Function:**
```javascript
/**
 * Weekly content generation job.
 * Generates: 5 trivia questions, 3 "Kya Aap Jaante Hain" facts, 4 Hanuman Chalisa chaupais.
 * All content is inserted into ContentPool with verified: false (requires admin approval).
 * @param {Object} job - BullMQ job object
 * @returns {Promise<{ triviaAdded, factsAdded, chaupaisAdded }>}
 */
async function processContentGeneration(job)
```

**Queue registration — add to `server/src/config/queues.js`:**
```javascript
// New queue
function getIntelligenceQueue() { /* same pattern as existing queues */ }

// New JOB_NAMES entries:
CONTENT_GENERATION: 'contentGeneration',
```

**Queue registration — add to `server/src/jobs/index.js`:**
- Create `intelligenceWorker` (new Worker on `intelligenceQueue`, concurrency: 1)
- Register repeatable job: `contentGeneration` with cron `0 23 * * 0`, tz `Asia/Kolkata`

**Acceptance criteria:**
- [ ] Job runs at Sunday 11 PM IST (verify with BullMQ dashboard or log)
- [ ] Creates 5 trivia items, 3 facts, 4 chaupais in `ContentPool` table
- [ ] All generated content has `verified: false` and `generatedBy: 'gemini-2.5-pro'`
- [ ] Existing content in pool is not duplicated (check topics against recent entries)
- [ ] Job handles Gemini API errors gracefully (retries 3x with exponential backoff)
- [ ] Job logs completion with item counts

---

### S1-T6: Dashboard — Content Pool Widget on `/dashboard`

**File to modify:** `dashboard/src/app/dashboard/page.jsx`
**File to create:** `dashboard/src/components/ContentPoolCard.jsx`

**ContentPoolCard component:**
```jsx
// Props: { trivia: { unused, total, lastGenerated }, facts: {...}, chaupais: {...} }
// Renders: Three mini-gauge bars showing pool levels
// Each bar: label, filled bar (green > 10, yellow 5-10, red < 5), count text
// Below bars: "Last generated: {relative time}" text
// Uses glass-card CSS class (consistent with existing StreakCard)
```

**API endpoint to create:** `server/src/routes/admin.js` (new file if not exists)
```
GET /api/admin/content/pool-levels
Response: {
  trivia: { unused: 23, total: 45, lastGenerated: "2026-03-28T17:30:00Z" },
  facts: { unused: 15, total: 30, lastGenerated: "2026-03-28T17:30:00Z" },
  chaupais: { unused: 8, total: 20, lastGenerated: "2026-03-28T17:30:00Z" }
}
Auth: Admin-only (check isAdmin flag or ADMIN_WHATSAPP_NUMBER match)
```

**Dashboard integration:**
- Add `ContentPoolCard` to the cards grid in `/dashboard`, below the existing Streak + TodayMessage row
- Fetch data in `fetchData()` alongside existing profile/streak/messages calls

**Acceptance criteria:**
- [ ] Card renders with three pool type gauges
- [ ] Colors change at thresholds: green (>10), yellow (5-10), red (<5)
- [ ] "Last generated" shows relative time (e.g., "2 days ago")
- [ ] API returns correct counts matching database reality

---

### S1-T7: Dashboard — Content Log Tab on `/history`

**File to modify:** `dashboard/src/app/history/page.jsx`
**File to create:** `dashboard/src/components/ContentLogBadge.jsx`

**Changes to history page:**
- Add content type badge (colored pill) to each `MessageCard` in the history list
- Badge colors: Raashifal = orange, Shloka/Verse = saffron, Sandesh = blue, Trivia = green, Bonus = purple, Fact = teal
- Add small engagement indicator: green checkmark if `gotReply`, grey dash if not
- Show `contentTag` as a secondary label (e.g., "gita", "practical")

**API changes:**
- Extend existing `GET /api/messages` response to include: `contentType`, `contentTag`, `gotReply`, `replyMinutes` fields
- Server-side: join `DailyMessage` with `ContentLog` on `userId + date`

**ContentLogBadge component:**
```jsx
// Props: { contentType: string, contentTag?: string, gotReply: boolean, replyMinutes?: number }
// Renders: colored pill with content type label + optional tag + reply indicator
```

**Acceptance criteria:**
- [ ] Each message in history shows a colored content type badge
- [ ] Reply indicator shows green check for replied messages
- [ ] Content tags display when available
- [ ] No visual regression on existing history page layout

---

## Sprint 2 (Week 2): Raashifal Variation Engine

### S2-T1: Add 6 Raashifal Lenses to promptService.js

**File to create:** `server/src/services/raashifalLensService.js`

**Data:**
```javascript
const LENSES = [
  { key: 'practical', inject: 'Focus on career, money decisions, and time management. Mention specific actions: "sign that document", "avoid lending money today".' },
  { key: 'emotional', inject: 'Focus on relationships — spouse, parents, children, friends. Mention a specific relational dynamic.' },
  { key: 'karmic', inject: 'Frame the day through karma and past-life patterns. Reference Shani, Rahu effects. Mention what past actions are bearing fruit.' },
  { key: 'health', inject: 'Focus on physical/mental health. Mention specific advice: "avoid heavy food after 2 PM", "evening walk will clear confusion".' },
  { key: 'wealth', inject: 'Focus on dhan and financial decisions. Be specific: "investment ka faisla aaj mat lo", "unexpected expense aa sakta hai".' },
  { key: 'spiritual', inject: 'Focus on sadhana and inner growth. Mention specific practices: "do 11 minutes of japa today", "visit mandir in the evening".' },
];
```

**Functions:**
```javascript
/**
 * Get today's raashifal lens based on day of year.
 * Cycles through 6 lenses deterministically.
 * @param {Date} date
 * @returns {{ key: string, inject: string }}
 */
function getLensForDate(date)
```

**Acceptance criteria:**
- [ ] Same date always returns the same lens
- [ ] Lenses cycle through all 6 over 6 consecutive days
- [ ] Function is pure (no side effects, no DB calls)

---

### S2-T2: Create scenarioSeedService.js

**File to create:** `server/src/services/scenarioSeedService.js`
**File to create:** `server/src/data/scenarioSeeds.json` (50 seeds — use the list from execution.md section 2.4)

**Functions:**
```javascript
/**
 * Get a deterministic scenario seed for a user on a given date.
 * Uses MD5 hash of userId + dateStr to select from 50 seeds.
 * @param {string} userId
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} Scenario description
 */
function getScenarioSeed(userId, dateStr)

/**
 * Get the prompt injection text for the scenario seed.
 * @param {string} seed - The scenario string
 * @returns {string} Full injection text for the prompt
 */
function getScenarioInjection(seed)
```

**Acceptance criteria:**
- [ ] Same userId + date always returns the same seed
- [ ] Different userIds on the same date get different seeds (verify with 10 UUIDs)
- [ ] All 50 seeds are reachable (verify with 1000 random inputs)

---

### S2-T3: Update daily_v2.txt Prompt Template

**File to modify:** `server/src/prompts/daily_v2.txt`

**Add these injection slots** (after the panchang section, before the output format instructions):

```
---
TODAY'S RAASHIFAL LENS: {raashifalLens}
{raashifalLensInstruction}

MICRO-SCENARIO: {scenarioSeed}
Imagine this user's situation today. Let this subtly color the raashifal and sandesh — but do NOT mention the scenario explicitly. It should feel eerily relevant, not stated outright.
---
```

**Acceptance criteria:**
- [ ] Template has `{raashifalLens}`, `{raashifalLensInstruction}`, and `{scenarioSeed}` placeholders
- [ ] Placeholders do not break existing prompt parsing logic

---

### S2-T4: Update dailyMessageService.js — Inject Lens + Seed

**File to modify:** `server/src/services/dailyMessageService.js`

**Changes:**
1. Import `raashifalLensService` and `scenarioSeedService`
2. In the message generation function, before calling Gemini:
   - Call `getLensForDate(new Date())` to get today's lens
   - Call `getScenarioSeed(userId, dateStr)` to get the user's scenario
3. Replace placeholders in the prompt template with actual values
4. After message is sent, call `contentLogService.logContent()` with:
   - `contentType: 'raashifal'`, `contentTag: lens.key`
   - `contentType: 'bhagwan_sandesh'`, `contentTag: variantStyle` (or 'default' if no variant yet)

**Acceptance criteria:**
- [ ] Generated messages now vary in focus day-to-day (verify by comparing 3 consecutive days for same user)
- [ ] ContentLog entries are created for every sent message with correct types and tags
- [ ] No regression on message delivery timing or format

---

### S2-T5: Dashboard — Prompt Variation Card

**File to create:** `dashboard/src/components/PromptVariationCard.jsx`
**File to modify:** `dashboard/src/app/dashboard/page.jsx`

**PromptVariationCard component:**
```jsx
// Props: { lensToday: string, scenarioSample: string, userCount: number }
// Renders:
//   Header: "Today's Raashifal Lens"
//   Body: Lens name in large text (e.g., "PRACTICAL"), lens description below
//   Footer: "Scenario seeds active for {userCount} users"
// Uses glass-card CSS class
```

**API endpoint:**
```
GET /api/admin/prompt/today
Response: {
  lens: { key: "practical", description: "Focus on career, money decisions..." },
  scenarioSampleSize: 50,
  activeUserCount: 127
}
```

**Acceptance criteria:**
- [ ] Card shows today's lens name and description
- [ ] Updates daily (lens rotates)
- [ ] Fits visually into existing dashboard card grid

---

## Sprint 3 (Week 3): Calendar + Personalization

### S3-T1: Add HinduCalendarEvent to Schema

**File to modify:** `server/prisma/schema.prisma`

**Schema addition:**
```prisma
model HinduCalendarEvent {
  id        String   @id @default(uuid())
  date      DateTime @db.Date
  eventType String   // ekadashi, amavasya, purnima, navratri, day_deity, ritu, major_festival
  name      String
  metadata  Json?    // { deity, theme, description, etc. }
  createdAt DateTime @default(now())

  @@unique([date, eventType, name])
  @@index([date])
}
```

**Migration:**
```bash
cd server && npx prisma migrate dev --name add_hindu_calendar_event
```

**Acceptance criteria:**
- [ ] Migration completes successfully
- [ ] `HinduCalendarEvent` table exists with unique constraint on `[date, eventType, name]`
- [ ] Can upsert events without duplicates

---

### S3-T2: Create calendarService.js + calendarSeedJob.js

**File to create:** `server/src/services/calendarService.js`
**File to create:** `server/src/jobs/calendarSeedJob.js`

**calendarService.js functions:**
```javascript
/**
 * Get all calendar events for a given date.
 * @param {Date} date
 * @returns {Promise<HinduCalendarEvent[]>}
 */
async function getEventsForDate(date)

/**
 * Build a prompt injection string from today's calendar events.
 * @param {Date} date
 * @returns {Promise<string>} Multi-line text for prompt injection
 */
async function getCalendarContext(date)
```

**calendarSeedJob.js:**
- **Job name:** `calendarSeed`
- **Queue:** `intelligenceQueue`
- **Cron:** `0 22 * * 0` (Sunday 10 PM IST)
- **Logic:** Generate next 7 days of day-deity and ritu events. Upsert to avoid duplicates.

**Function:**
```javascript
/**
 * Seed the next 7 days of Hindu calendar events.
 * Creates day_deity and ritu events for each day.
 * Does NOT call any AI model — uses static DAY_DEITIES and getRitu() mappings.
 * @param {Object} job - BullMQ job
 * @returns {Promise<{ eventsSeeded: number }>}
 */
async function processCalendarSeed(job)
```

**Register in `server/src/jobs/index.js`:**
- Add `calendarSeed` to intelligenceWorker's job routing
- Register repeatable: cron `0 22 * * 0`, tz `Asia/Kolkata`

**Acceptance criteria:**
- [ ] After job runs, `HinduCalendarEvent` has 14 rows for next 7 days (7 day_deity + 7 ritu)
- [ ] Running job twice does not create duplicates (upsert)
- [ ] `getCalendarContext()` returns human-readable text injection for a given date
- [ ] Modify `dailyMessageService.js` to call `getCalendarContext()` and inject `{calendarContext}` into prompt

---

### S3-T3: Create engagementService.js

**File to create:** `server/src/services/engagementService.js`

**Functions:**
```javascript
/**
 * Recalculate engagement profile for a single user.
 * Computes: replyRate, avgReplyMinutes, peakHour, tier (high/medium/low), totalMessages30d
 * Stores result in User.engagementProfile (Json field).
 * @param {string} userId
 * @returns {Promise<Object>} The computed profile
 */
async function updateEngagementProfile(userId)

/**
 * Get tone injection text based on engagement tier.
 * @param {Object} engagementProfile - User's engagement profile JSON
 * @returns {string} Prompt injection text
 */
function getToneInjection(engagementProfile)
```

**Tier definitions:**
- `high`: replyRate >= 0.30 — ask questions, create dialogue, use cliffhangers
- `medium`: replyRate >= 0.10 — mix of punchy statements and light questions
- `low`: replyRate < 0.10 — punchy, shareable, no questions

**Integration:**
- `dailyMessageService.js` — read `user.engagementProfile.tier`, call `getToneInjection()`, inject into prompt as `{toneInstruction}`

**Acceptance criteria:**
- [ ] Profile correctly computes reply rate from ContentLog data
- [ ] Tier assignment matches thresholds
- [ ] `getToneInjection()` returns different text for each tier
- [ ] Profile is stored as JSON in `User.engagementProfile`

---

### S3-T4: Create engagementUpdateJob.js

**File to create:** `server/src/jobs/engagementUpdateJob.js`

**BullMQ job details:**
- **Job name:** `engagementProfileUpdate`
- **Queue:** `intelligenceQueue`
- **Cron:** `0 3 * * *` (daily 3 AM IST)
- **Concurrency:** 1

**Function:**
```javascript
/**
 * Batch-update engagement profiles for all onboarded users.
 * @param {Object} job
 * @returns {Promise<{ usersUpdated: number }>}
 */
async function processEngagementUpdate(job)
```

**Register in `server/src/jobs/index.js`:**
- Add to intelligenceWorker routing
- Register repeatable: cron `0 3 * * *`, tz `Asia/Kolkata`

**Acceptance criteria:**
- [ ] Job processes all `isOnboarded: true` users
- [ ] Each user's `engagementProfile` JSON is updated
- [ ] Job completes in < 60 seconds for 1000 users
- [ ] Handles users with zero ContentLog rows gracefully (tier = "low")

---

### S3-T5: Dashboard — Calendar Widget + Engagement Heatmap

**Files to create:**
- `dashboard/src/components/CalendarWidget.jsx`
- `dashboard/src/components/EngagementHeatmap.jsx`

**File to modify:** `dashboard/src/app/dashboard/page.jsx`

**CalendarWidget:**
```jsx
// Props: { events: [{ date, eventType, name, metadata }] }
// Renders: This week's calendar events in a compact list
//   - Day deity shown as icon + name
//   - Special events (ekadashi, purnima, festivals) highlighted
//   - Current day highlighted
// Uses glass-card CSS class
```

**API endpoint:**
```
GET /api/admin/calendar/thisweek
Response: [{ date, eventType, name, metadata }]
```

**EngagementHeatmap:**
```jsx
// Props: { distribution: { high: number, medium: number, low: number, total: number } }
// Renders: Three horizontal bars showing user distribution by engagement tier
//   - Green bar: high tier (count + percentage)
//   - Yellow bar: medium tier
//   - Grey bar: low tier
// Uses glass-card CSS class
```

**API endpoint:**
```
GET /api/admin/engagement/distribution
Response: { high: 12, medium: 45, low: 70, total: 127 }
```

**Acceptance criteria:**
- [ ] Calendar widget shows next 7 days of events
- [ ] Special events (ekadashi, purnima, festivals) are visually distinct from daily deity events
- [ ] Engagement heatmap correctly sums to total user count
- [ ] Both cards render in the dashboard grid without layout breakage

---

## Sprint 4 (Week 4): A/B Testing + Narrative Cycle

### S4-T1: Add PromptVariant, UserPromptVariant, WeeklyTheme to Schema

**File to modify:** `server/prisma/schema.prisma`

**Schema additions:**
```prisma
model PromptVariant {
  id              String    @id @default(uuid())
  featureKey      String    // bhagwan_sandesh, raashifal, daily_message
  style           String    // father, friend, guru, etc.
  promptText      String    // full prompt template
  isActive        Boolean   @default(true)
  verified        Boolean   @default(true) // false = needs admin approval
  lastReplyRate   Float?
  lastEvaluatedAt DateTime?
  parentVariantId String?   // if auto-optimized from another variant
  generatedBy     String?   // model name or "manual"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  userAssignments UserPromptVariant[]

  @@index([featureKey, isActive])
}

model UserPromptVariant {
  id         String        @id @default(uuid())
  userId     String
  user       User          @relation(fields: [userId], references: [id])
  variantId  String
  variant    PromptVariant @relation(fields: [variantId], references: [id])
  featureKey String
  assignedAt DateTime      @default(now())

  @@unique([userId, featureKey])
  @@index([variantId])
}

model WeeklyTheme {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  weekNumber     Int      // absolute week number
  cycleWeek      Int      // 1-12 within current cycle
  cycle          Int      // which 12-week cycle
  themeSanskrit  String
  themeEnglish   String
  teaching       String
  startsAt       DateTime
  createdAt      DateTime @default(now())

  @@index([userId, weekNumber])
}
```

**Migration:**
```bash
cd server && npx prisma migrate dev --name add_variants_and_themes
```

**Seed script** — create `server/prisma/seeds/seedVariants.js`:
```javascript
// Insert 3 initial PromptVariant rows for bhagwan_sandesh:
// 1. style: "father" — loving parent voice
// 2. style: "friend" — wise friend voice
// 3. style: "guru" — spiritual teacher voice
// Each with a full promptText template
```

**Run seed:** `node server/prisma/seeds/seedVariants.js`

**Acceptance criteria:**
- [ ] Migration completes successfully
- [ ] 3 seed variants exist in PromptVariant table
- [ ] `UserPromptVariant` enforces unique `[userId, featureKey]` — same user cannot be assigned two bhagwan_sandesh variants

---

### S4-T2: Create variantService.js

**File to create:** `server/src/services/variantService.js`

**Functions:**
```javascript
/**
 * Assign a prompt variant to a user (balanced distribution).
 * If user already has one for this featureKey, return existing.
 * @param {string} userId
 * @param {string} featureKey - Default "bhagwan_sandesh"
 * @returns {Promise<string>} variantId
 */
async function assignVariant(userId, featureKey = 'bhagwan_sandesh')

/**
 * Get the prompt text for a variant.
 * @param {string} variantId
 * @returns {Promise<string|null>} Prompt text
 */
async function getVariantPrompt(variantId)

/**
 * Get performance stats for all active variants of a feature.
 * @param {string} featureKey
 * @returns {Promise<Array<{ id, style, replyRate, userCount, isWinner }>>}
 */
async function getVariantPerformance(featureKey = 'bhagwan_sandesh')
```

**Integration:**
- `dailyMessageService.js` — call `assignVariant(userId)` to get variantId, then `getVariantPrompt(variantId)` to get the Bhagwan Sandesh voice instruction. Inject into prompt.

**Acceptance criteria:**
- [ ] New users are assigned to the variant with fewest users
- [ ] Existing users keep their existing variant
- [ ] `getVariantPerformance()` returns correct reply rates from ContentLog data

---

### S4-T3: Create variantRotationJob.js

**File to create:** `server/src/jobs/variantRotationJob.js`

**BullMQ job details:**
- **Job name:** `variantRotation`
- **Queue:** `intelligenceQueue`
- **Cron:** `0 5 * * 1` (Monday 5 AM IST)

**Function:**
```javascript
/**
 * Evaluate variant performance over last 7 days.
 * Move 20% of worst variant's users to best variant.
 * Update lastReplyRate and lastEvaluatedAt on all variants.
 * Skip if no clear winner (all rates equal).
 * @param {Object} job
 * @returns {Promise<{ best, worst, moved } | { action: 'skipped' }>}
 */
async function processVariantRotation(job)
```

**Acceptance criteria:**
- [ ] Correctly calculates reply rate per variant from ContentLog
- [ ] Moves exactly 20% of worst variant's users (min 1)
- [ ] Updates `lastReplyRate` and `lastEvaluatedAt` on all variants
- [ ] Skips rotation if all variants have equal reply rates
- [ ] Logs moved user count

---

### S4-T4: Create weeklyThemeJob.js + 12-Week Cycle Data

**File to create:** `server/src/jobs/weeklyThemeJob.js`

**BullMQ job details:**
- **Job name:** `weeklyTheme`
- **Queue:** `intelligenceQueue`
- **Cron:** `30 23 * * 0` (Sunday 11:30 PM IST)

**12-week cycle data** (embedded in the job file as a constant):

| Week | Sanskrit | English | Teaching |
|------|----------|---------|----------|
| 1 | Shraddha | Faith | Vishwas rakhna seekho... |
| 2 | Karma | Action | Karm karo, phal ki chinta mat karo... |
| 3 | Shakti | Inner Strength | Tumhare andar woh shakti hai... |
| 4 | Dhairya | Patience | Sabr ka phal meetha hota hai... |
| 5 | Bhakti | Devotion | Bhakti sirf mandir mein nahi... |
| 6 | Viveka | Discernment | Sahi aur galat mein fark karna... |
| 7 | Seva | Selfless Service | Jab tum dusron ke liye jeete ho... |
| 8 | Vairagya | Detachment | Chhod dena seekho... |
| 9 | Satya | Truth | Sachhai se bada koi dharm nahi... |
| 10 | Kshama | Forgiveness | Maaf karna kamzori nahi... |
| 11 | Ananda | Joy | Anand bahar se nahi milta... |
| 12 | Moksha | Liberation | Sabse badi azaadi... |

**Also export:**
```javascript
/**
 * Get the 4-beat arc instruction for a given day of week.
 * Mon-Tue: introduce, Wed-Thu: explore, Fri-Sat: challenge, Sun: resolve
 * @param {number} dayOfWeek - 0=Sun, 1=Mon, ..., 6=Sat
 * @returns {{ beat: string, instruction: string }}
 */
function getArcBeat(dayOfWeek)
```

**Integration into `dailyMessageService.js`:**
- Read user's current `WeeklyTheme` from DB
- Call `getArcBeat(new Date().getDay())`
- Inject `{themeSanskrit}`, `{themeEnglish}`, `{teaching}`, `{arcBeat}`, `{arcInstruction}` into prompt
- If cycle >= 2, inject the depth-note text (see execution.md section 5.4)

**Acceptance criteria:**
- [ ] After job runs, every onboarded user has a new WeeklyTheme row
- [ ] `contentCycleWeek` on User increments by 1
- [ ] Week 13 wraps to cycleWeek 1, cycle 2
- [ ] Arc beats follow the Mon-Tue/Wed-Thu/Fri-Sat/Sun pattern
- [ ] Prompt includes theme and arc instruction

---

### S4-T5: Dashboard — A/B Testing Panel + Weekly Theme Card

**Files to create:**
- `dashboard/src/components/ABTestingCard.jsx`
- `dashboard/src/components/WeeklyThemeCard.jsx`

**File to modify:** `dashboard/src/app/dashboard/page.jsx`

**ABTestingCard:**
```jsx
// Props: { variants: [{ style, replyRate, userCount, isWinner }] }
// Renders:
//   Header: "A/B Testing — Bhagwan Sandesh"
//   Body: Horizontal bar chart with 3 bars (one per variant)
//     - Bar width proportional to reply rate
//     - Winner bar has gold accent
//     - Label: "Father: 32% (45 users)" etc.
//   Footer: "Last rotation: {date}, {N} users moved"
// Uses glass-card CSS class
```

**API endpoint:**
```
GET /api/admin/variants/performance
Response: {
  variants: [
    { style: "father", replyRate: 0.32, userCount: 45, isWinner: true },
    { style: "friend", replyRate: 0.28, userCount: 42, isWinner: false },
    { style: "guru", replyRate: 0.25, userCount: 40, isWinner: false }
  ],
  lastRotation: "2026-03-24T23:30:00Z",
  usersMoved: 8
}
```

**WeeklyThemeCard:**
```jsx
// Props: { themeSanskrit, themeEnglish, teaching, arcBeat, cycleWeek, cycle }
// Renders:
//   Header: "This Week's Theme"
//   Large text: Sanskrit name (e.g., "Shraddha")
//   Subtitle: English name + "Cycle {N}, Week {W}"
//   Body: Teaching text in italics
//   Footer: "Today's beat: EXPLORE" with a small progress indicator (4 dots)
// Uses glass-card CSS class
```

**API endpoint:**
```
GET /api/admin/theme/current
Response: {
  themeSanskrit: "Karma",
  themeEnglish: "Action",
  teaching: "Karm karo, phal ki chinta mat karo...",
  arcBeat: "explore",
  cycleWeek: 2,
  cycle: 1
}
```

**Acceptance criteria:**
- [ ] A/B card renders three variant bars with correct data
- [ ] Winner bar is visually highlighted
- [ ] Theme card shows current week's theme and today's arc beat
- [ ] Both cards integrate into dashboard grid without breaking layout

---

## Sprint 5 (Month 2): AI Product Intelligence Layer

### S5-T1: Add InsightReport and PromptErrorLog to Schema

**File to modify:** `server/prisma/schema.prisma`

**Schema additions:**
```prisma
model InsightReport {
  id            String   @id @default(uuid())
  period        String   // "2026-03-21 to 2026-03-28"
  rawData       Json     // engagement data snapshot
  observations  Json     // string[]
  promptChanges Json     // [{ target, currentIssue, suggestedChange, expectedImpact }]
  featureIdea   Json     // { name, description, rationale, effort }
  alerts        Json     // string[]
  model         String   // which model generated this
  createdAt     DateTime @default(now())
}

model PromptErrorLog {
  id            String   @id @default(uuid())
  promptKey     String
  errorMessage  String
  promptSnippet String?
  createdAt     DateTime @default(now())

  @@index([promptKey, createdAt])
}

model JobRunLog {
  id         String   @id @default(uuid())
  jobName    String
  queue      String
  startedAt  DateTime
  finishedAt DateTime?
  duration   Int?      // milliseconds
  status     String    // completed, failed, stalled
  result     Json?
  error      String?
  createdAt  DateTime  @default(now())

  @@index([jobName, startedAt])
  @@index([status, startedAt])
}
```

**Note:** `JobRunLog` is new — not in the original execution.md schema section. It is needed to power the `/health` page job run history table. Populated by adding logging hooks to all BullMQ workers' `completed` and `failed` events.

**Migration:**
```bash
cd server && npx prisma migrate dev --name add_intelligence_schema
```

**Acceptance criteria:**
- [ ] All three tables exist in PostgreSQL
- [ ] InsightReport can store complex JSON in all Json fields
- [ ] JobRunLog `[jobName, startedAt]` index exists

---

### S5-T2: Create insightReportJob.js

**File to create:** `server/src/jobs/insightReportJob.js`

**BullMQ job details:**
- **Job name:** `insightReport`
- **Queue:** `intelligenceQueue`
- **Cron:** `0 6 * * 1` (Monday 6 AM IST)
- **Model:** `gemini-2.5-pro`

**Function:**
```javascript
/**
 * Weekly AI product intelligence report.
 * Gathers 7 days of engagement data, sends to Gemini Pro for analysis.
 * Saves report to InsightReport table.
 * Sends WhatsApp summary to admin.
 *
 * Data gathered:
 * - Reply rates by rashi
 * - Reply rates by content type
 * - Streak distribution
 * - Best performing bonus day
 * - Variant performance
 * - Active vs total users
 *
 * @param {Object} job
 * @returns {Promise<{ reportId: string }>}
 */
async function processInsightReport(job)
```

**Register in `server/src/jobs/index.js`:**
- Add to intelligenceWorker routing
- Register repeatable: cron `0 6 * * 1`, tz `Asia/Kolkata`

**Acceptance criteria:**
- [ ] Report is created in InsightReport table with all fields populated
- [ ] Observations are specific and reference actual numbers (not generic platitudes)
- [ ] WhatsApp summary sent to `ADMIN_WHATSAPP_NUMBER` (env var)
- [ ] Handles Gemini API failure gracefully (retries, logs error, does not crash worker)

---

### S5-T3: Insight Report Sent to Admin WhatsApp

**File to modify:** `server/src/jobs/insightReportJob.js` (already handled in S5-T2)

**Additional requirement:**
- Format the WhatsApp message as a structured summary (observations numbered, feature idea highlighted, alerts boxed)
- Use WhatsApp markdown: `*bold*`, `_italic_`, line breaks
- Keep under 1600 characters (WhatsApp limit)

**Acceptance criteria:**
- [ ] Admin receives WhatsApp message every Monday morning
- [ ] Message is readable on mobile (no wall of text)
- [ ] Message includes a "Full report in dashboard" CTA

---

### S5-T4: Dashboard — Intelligence Page (`/intelligence`)

**Files to create:**
- `dashboard/src/app/intelligence/page.jsx`
- `dashboard/src/components/InsightReportCard.jsx`
- `dashboard/src/components/TrendChart.jsx`
- `dashboard/src/components/ApprovalQueue.jsx`

**Page layout:**
```
/intelligence
+--------------------------------------+
|  Nav bar (same as /dashboard)        |
+--------------------------------------+
|  Latest Insight Report (full card)   |
|    - Observations (numbered list)    |
|    - Prompt Changes (table)          |
|    - Feature Idea (card)             |
|    - Alerts (red box)                |
+--------------------------------------+
|  Trend Charts (2x2 grid)            |
|    - Reply Rate Over Time (line)     |
|    - Streak Retention (bar)          |
|    - Viral Share Rate (line)         |
|    - Content Type Performance (bar)  |
+--------------------------------------+
|  Prompt Rewrite Approval Queue       |
|    - Pending rewrite cards           |
|    - Approve / Reject buttons        |
+--------------------------------------+
|  Report History (collapsible list)   |
+--------------------------------------+
```

**API endpoints:**
```
GET /api/admin/intelligence/reports?limit=10&page=1
Response: { reports: [InsightReport], total: number, page: number }

GET /api/admin/intelligence/reports/:id
Response: InsightReport

GET /api/admin/intelligence/trends?weeks=8
Response: {
  replyRates: [{ week: "2026-W12", verse: 0.15, raashifal: 0.22, sandesh: 0.30, trivia: 0.18 }],
  streakDistribution: [{ week: "2026-W12", buckets: { "0": 30, "1-3": 25, "4-7": 20, "8-21": 15, "22-40": 8, "40+": 2 } }],
  viralRate: [{ week: "2026-W12", referrals: 5 }]
}

GET /api/admin/variants/pending
Response: [{ id, featureKey, style, promptText, parentVariantId, parentPromptText, parentReplyRate, generatedBy, createdAt }]

POST /api/admin/variants/:id/approve
Response: { success: true, variant: PromptVariant }

POST /api/admin/variants/:id/reject
Response: { success: true }
```

**Chart library:** Use a lightweight chart library. Recommended: `recharts` (already common in Next.js projects) or `chart.js` via `react-chartjs-2`. Install via:
```bash
cd dashboard && npm install recharts
```

**Acceptance criteria:**
- [ ] Page loads with latest insight report displayed
- [ ] Trend charts render with 8 weeks of data (or fewer if less history exists)
- [ ] Approve button sets `verified: true, isActive: true` and removes card from queue
- [ ] Reject button removes variant from queue
- [ ] Report history is paginated and expandable
- [ ] Page is auth-guarded (redirects to /login if not authenticated)

---

### S5-T5: Content Approval Flow in Dashboard

**Handled within `/content` page (see Dashboard Page Specifications below)**

This is the approve/reject flow for AI-generated `ContentPool` items where `verified: false`.

**API endpoints:**
```
POST /api/admin/content/:id/approve
Body: {} (no body needed)
Logic: SET verified = true, isActive = true
Response: { success: true, content: ContentPool }

POST /api/admin/content/:id/reject
Body: {} (no body needed)
Logic: SET isActive = false, rejectedAt = new Date()
Response: { success: true }
```

**Acceptance criteria:**
- [ ] Only content with `verified: false` shows approve/reject buttons
- [ ] After approval, content becomes available for `pickFreshContent()` selection
- [ ] After rejection, content is hidden from pool selection and marked with rejection timestamp

---

### S5-T6: Prompt Rewrite Approval Flow

**Handled within `/intelligence` page (S5-T4 ApprovalQueue component)**

Shows `PromptVariant` entries where `verified: false`. Each card displays:
- Original variant's prompt text (from `parentVariantId` lookup) — collapsed by default
- AI-rewritten prompt text — expanded
- Model that generated the rewrite
- Parent variant's last reply rate
- Two buttons: Approve / Reject

**Acceptance criteria:**
- [ ] Approved rewrites become active (assigned to new users via balanced distribution)
- [ ] Rejected rewrites are deleted (hard delete, since they were never active)
- [ ] Original parent variant remains unaffected by either action

---

## Sprint 6 (Month 2-3): Self-Healing

### S6-T1: Error Pattern Tracking on Prompts

**File to create:** `server/src/services/selfHealingService.js`

**Functions:**
```javascript
/**
 * Log a prompt error. Called from aiService.js catch blocks.
 * If error count exceeds threshold (3 in 24h), triggers auto-repair.
 * @param {string} promptKey - Identifier for the prompt (e.g., "daily_v2", "bonus_dream")
 * @param {string} errorMessage - The error message
 * @param {string} promptText - The prompt text that failed (first 500 chars)
 */
async function logPromptError(promptKey, errorMessage, promptText)

/**
 * Auto-repair a broken prompt using Gemini Pro.
 * Creates a new PromptVariant with verified: false for admin review.
 * @param {string} promptKey
 * @param {string} originalPrompt
 * @param {string} lastError
 */
async function repairPrompt(promptKey, originalPrompt, lastError)
```

**Integration point:**
- `server/src/services/aiService.js` — wrap Gemini API calls in try/catch, call `logPromptError()` on failure

**Acceptance criteria:**
- [ ] Every Gemini API error creates a `PromptErrorLog` row
- [ ] After 3 errors in 24h for the same `promptKey`, `repairPrompt()` is called
- [ ] Repaired prompt is saved as `PromptVariant` with `verified: false`, `style: 'auto_repair'`
- [ ] Does not trigger repair more than once per 24h window per promptKey

---

### S6-T2: Create selfHealJob.js

**File to create:** `server/src/jobs/selfHealJob.js`

**BullMQ job details:**
- **Job name:** `selfHeal`
- **Queue:** `intelligenceQueue`
- **Cron:** `0 4 * * *` (daily 4 AM IST)

**Function:**
```javascript
/**
 * Daily self-healing check.
 * 1. Check for prompts with error counts exceeding threshold that haven't been auto-repaired
 * 2. Check for stalled BullMQ jobs
 * 3. Verify content pool levels and trigger emergency generation if critical
 * 4. Create alert records for dashboard display
 * @param {Object} job
 * @returns {Promise<{ repairs, stalledJobs, poolAlerts }>}
 */
async function processSelfHeal(job)
```

**Acceptance criteria:**
- [ ] Detects prompts with 3+ errors in last 24h
- [ ] Creates repair variants for unrepaired prompts
- [ ] Detects if content pool has < 3 unused items for any type and logs alert
- [ ] Creates actionable alert records viewable on `/health`

---

### S6-T3: Scripture Exhaustion Alert + Auto-Generation

**File to create:** `server/src/jobs/scriptureExhaustionJob.js`

**BullMQ job details:**
- **Job name:** `scriptureExhaustion`
- **Queue:** `intelligenceQueue`
- **Cron:** `0 2 * * 1` (Monday 2 AM IST)
- **Model:** `gemini-2.5-pro` (conditional — only if users are near exhaustion)

**Function:**
```javascript
/**
 * Check how many unseen verses each user has.
 * If any user has < 10 unseen verses, generate 10 new scripture entries via Gemini Pro.
 * @param {Object} job
 * @returns {Promise<{ alertedUsers, totalScriptures, newVersesGenerated? }>}
 */
async function processScriptureExhaustion(job)
```

**Acceptance criteria:**
- [ ] Correctly counts unseen verses per user
- [ ] Triggers generation when any user has < 10 unseen
- [ ] Generated verses are upserted (no duplicates on `[source, reference]`)
- [ ] Does NOT call Gemini Pro if no users are near exhaustion (saves cost)

---

### S6-T4: Streak Recovery Message Generator

**File to modify:** `server/src/jobs/streakCheckJob.js`

**Changes:**
- After detecting a streak break where `previousStreak >= 7` and `newStreak === 0`:
  - Generate a personalized welcome-back message using Gemini Flash
  - Send via Twilio WhatsApp
  - Log to ContentLog with `contentType: 'streak_recovery'`

**Function to add:**
```javascript
/**
 * Generate a personalized streak recovery message.
 * Uses user's name, previous streak count, and favorite content tags.
 * @param {Object} user - User object with name, streakCount, id
 * @returns {Promise<string>} The recovery message text
 */
async function generateStreakRecoveryMessage(user)
```

**Acceptance criteria:**
- [ ] Only triggers for streaks of 7+ days that break to 0
- [ ] Message is in Hindi/Hinglish, warm, non-guilt-tripping
- [ ] Message references the user's previous streak count
- [ ] ContentLog row created with `contentType: 'streak_recovery'`

---

### S6-T5: Dashboard — System Health Page (`/health`)

**Files to create:**
- `dashboard/src/app/health/page.jsx`
- `dashboard/src/components/JobRunTable.jsx`
- `dashboard/src/components/ErrorLogPanel.jsx`
- `dashboard/src/components/ContentExhaustionMonitor.jsx`
- `dashboard/src/components/AlertsPanel.jsx`

**Page layout:**
```
/health
+--------------------------------------+
|  Nav bar (same as /dashboard)        |
+--------------------------------------+
|  System Status Badge (large)         |
|    Green/Yellow/Red + summary text   |
+--------------------------------------+
|  Active Alerts Panel                 |
|    - Alert cards with severity,      |
|      message, and action link        |
+--------------------------------------+
|  Job Run History Table               |
|    - Filterable by job name, status  |
|    - Last 7 days                     |
|    - Failed jobs highlighted red     |
+--------------------------------------+
|  Error Log Panel                     |
|    - PromptErrorLog entries          |
|    - Grouped by promptKey            |
+--------------------------------------+
|  Content Exhaustion Monitor          |
|    - Per-type pool levels            |
|    - Scripture coverage chart        |
|    - Days-until-exhaustion estimates  |
+--------------------------------------+
```

**API endpoints:**
```
GET /api/admin/health/summary
Response: {
  status: "healthy" | "warning" | "critical",
  failedJobs24h: number,
  pendingAlerts: number,
  lastJobRun: { name, finishedAt, status }
}

GET /api/admin/health/jobs?days=7&jobName=&status=
Response: {
  jobs: [{ jobName, queue, startedAt, finishedAt, duration, status, result, error }],
  total: number
}

GET /api/admin/health/errors?days=7
Response: {
  errors: [{ id, promptKey, errorMessage, promptSnippet, createdAt }],
  summary: [{ promptKey, count }]
}

GET /api/admin/health/content-exhaustion
Response: {
  pools: [
    { type: "trivia", total: 45, unused: 23, dailySendRate: 1.2, daysRemaining: 19 },
    { type: "fact", total: 30, unused: 15, dailySendRate: 0.8, daysRemaining: 18 },
    { type: "hanuman_chaupai", total: 20, unused: 8, dailySendRate: 0.14, daysRemaining: 57 }
  ]
}

GET /api/admin/health/scripture-coverage
Response: {
  totalScriptures: 150,
  distribution: [
    { bucket: ">80% seen", userCount: 5 },
    { bucket: "50-80% seen", userCount: 20 },
    { bucket: "<50% seen", userCount: 102 }
  ],
  atRisk: [{ userId, name, unseenCount }]  // users with < 10 unseen
}

GET /api/admin/alerts/active
Response: [
  {
    id: "uuid",
    type: "prompt_error" | "content_exhaustion" | "engagement_drop" | "job_failure",
    severity: "info" | "warning" | "critical",
    message: "Daily message prompt has failed 3x in 24h",
    linkTo: "/intelligence",  // where to take action
    createdAt: "2026-03-29T01:00:00Z"
  }
]
```

**JobRunLog population — modify `server/src/jobs/index.js`:**
Add to every worker's `completed` and `failed` event handlers:
```javascript
worker.on('completed', async (job, result) => {
  await prisma.jobRunLog.create({
    data: {
      jobName: job.name,
      queue: 'queueName',
      startedAt: new Date(job.processedOn),
      finishedAt: new Date(),
      duration: Date.now() - job.processedOn,
      status: 'completed',
      result: result ? JSON.parse(JSON.stringify(result)) : null,
    }
  });
});

worker.on('failed', async (job, err) => {
  await prisma.jobRunLog.create({
    data: {
      jobName: job?.name || 'unknown',
      queue: 'queueName',
      startedAt: job?.processedOn ? new Date(job.processedOn) : new Date(),
      finishedAt: new Date(),
      duration: job?.processedOn ? Date.now() - job.processedOn : 0,
      status: 'failed',
      error: err.message,
    }
  });
});
```

**Acceptance criteria:**
- [ ] Page loads with correct system status badge
- [ ] Job run history table shows all job executions from last 7 days
- [ ] Failed jobs are highlighted in red with expandable error message
- [ ] Error log panel groups errors by promptKey with counts
- [ ] Content exhaustion monitor shows per-type days-remaining estimates
- [ ] Scripture coverage chart shows user distribution
- [ ] Alerts panel shows all actionable alerts with severity badges
- [ ] Page is auth-guarded

---

## Dashboard Page Specifications

### New Pages

#### 1. `/intelligence` — AI Insights Hub

**Purpose:** The AI brain of the product. Where the founder reviews what the AI learned and what it recommends.

**Sections:**
1. **Latest Insight Report** (InsightReportCard) — Full rendering of the most recent `InsightReport`
   - Observations as a numbered list
   - Prompt Changes as a table (Target | Current Issue | Suggested Change | Expected Impact)
   - Feature Idea as a highlighted card
   - Alerts in a red-bordered box
2. **Trend Charts** (TrendChart) — 2x2 grid:
   - Reply Rate Over Time: line chart, 8 weeks, one line per content type
   - Streak Retention Funnel: stacked bar chart, this week vs last week
   - Viral Share Rate: line chart, referral code usage over time
   - Content Type Performance: grouped bar chart, reply rate by content type for current week
3. **Prompt Rewrite Approval Queue** (ApprovalQueue) — Cards for `PromptVariant` where `verified: false`
   - Show diff: original (collapsed) vs rewrite (expanded)
   - Approve / Reject buttons
   - Model attribution and parent variant reply rate
4. **Report History** — Collapsible list of all past InsightReport entries, click to expand

**Nav link:** Add "Intelligence" to the nav bar in `dashboard/src/app/dashboard/page.jsx` and all pages sharing the nav.

---

#### 2. `/health` — System Health

**Purpose:** Ops dashboard for checking system status when something feels off.

**Sections:**
1. **System Status Badge** — Large green/yellow/red indicator with summary text
2. **Active Alerts Panel** — Cards with severity, message, action link
3. **Job Run History Table** — Filterable by job name and status, last 7 days
4. **Error Log Panel** — PromptErrorLog entries grouped by promptKey
5. **Content Exhaustion Monitor** — Per-type pool levels with days-remaining estimates
6. **Scripture Coverage** — Distribution chart of user verse coverage

**Nav link:** Add "Health" to the nav bar.

---

#### 3. `/content` — Content Management

**Purpose:** Manage the AI-generated content pool, review and approve content before it reaches users.

**Sections:**
1. **Content Pool Browser** — Filterable, sortable table
   - Columns: Type, Content Preview (80 chars), Tags, Quality Score, Times Used, Generated By, Status, Created Date
   - Filters: By type (dropdown), by status (active/pending/rejected), by tag
   - Sort: By quality score, created date, times used
2. **Pending Approval Section** — Content with `verified: false` shown prominently at top
   - Approve / Reject buttons per item
   - Bulk approve/reject checkboxes
3. **Manual Content Entry Form** — Form to add content manually
   - Fields: Type (dropdown: fact/trivia/hanuman_chaupai/verse_commentary), Content (textarea), Tags (multi-select), Source (text input)
   - Submit creates ContentPool row with `generatedBy: "manual"`, `verified: true`
4. **Content Performance Table** — Top 20 content items ranked by reply rate
   - Columns: Content Preview, Type, Times Sent, Reply Rate, Avg Reply Speed

**Nav link:** Add "Content" to the nav bar.

**API endpoints:**
```
GET /api/admin/content/pool?type=&status=&page=1&limit=20
Response: { items: [ContentPool], total: number, page: number }

POST /api/admin/content/create
Body: { type, content, tags: string[], source?: string }
Response: { success: true, content: ContentPool }

GET /api/admin/content/performance?limit=20
Response: [{ contentId, contentPreview, type, timesSent, replyRate, avgReplyMinutes }]
```

---

### Updated Existing Pages

#### `/dashboard` — Main Dashboard Updates

**New widgets to add** (below existing StreakCard + TodayMessageCard):

| Widget | Component | Data Source | Position |
|--------|-----------|-------------|----------|
| System Health Badge | `HealthBadge.jsx` | `GET /api/admin/health/summary` | Top-right of greeting area |
| Weekly Theme | `WeeklyThemeCard.jsx` | `GET /api/admin/theme/current` | Cards grid, second row |
| A/B Variant Winner | `ABTestingCard.jsx` | `GET /api/admin/variants/performance` | Cards grid, second row |
| Content Pool Levels | `ContentPoolCard.jsx` | `GET /api/admin/content/pool-levels` | Cards grid, second row |
| Quick Alerts Strip | `AlertsStrip.jsx` | `GET /api/admin/alerts/active` | Below cards grid |

**New nav links to add:** Intelligence, Content, Health

#### `/history` — Message History Updates

**New additions per message card:**
- Content type badge (colored pill): `ContentLogBadge.jsx`
- Engagement indicator (check/dash icon)
- Content tag label

**API change:** Extend `GET /api/messages` to join ContentLog data

---

## Admin API Route Structure

All new admin endpoints go in a new routes file:

**File to create:** `server/src/routes/admin.js`

**Route prefix:** `/api/admin`

**Auth middleware:** Verify the request comes from an authenticated admin. Options:
1. Check that the authenticated user's phone matches `ADMIN_WHATSAPP_NUMBER` env var
2. Or add an `isAdmin` boolean field to the User model

**Route groupings:**
```
/api/admin/health/summary          GET
/api/admin/health/jobs             GET
/api/admin/health/errors           GET
/api/admin/health/content-exhaustion GET
/api/admin/health/scripture-coverage GET

/api/admin/intelligence/reports    GET (paginated)
/api/admin/intelligence/reports/:id GET
/api/admin/intelligence/trends     GET

/api/admin/variants/performance    GET
/api/admin/variants/pending        GET
/api/admin/variants/:id/approve    POST
/api/admin/variants/:id/reject     POST

/api/admin/content/pool-levels     GET
/api/admin/content/pool            GET (paginated, filterable)
/api/admin/content/create          POST
/api/admin/content/performance     GET
/api/admin/content/:id/approve     POST
/api/admin/content/:id/reject      POST

/api/admin/theme/current           GET
/api/admin/calendar/thisweek       GET
/api/admin/engagement/distribution GET
/api/admin/prompt/today            GET
/api/admin/alerts/active           GET
```

**Register in `server/src/routes/index.js`:**
```javascript
const adminRoutes = require('./admin');
router.use('/admin', adminAuthMiddleware, adminRoutes);
```

---

## Complete New Queue Registration

**File to modify:** `server/src/config/queues.js`

**Add:**
```javascript
// New queue factory
function getIntelligenceQueue() {
  if (!intelligenceQueue) {
    intelligenceQueue = new Queue('intelligenceQueue', {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return intelligenceQueue;
}

// New JOB_NAMES
const JOB_NAMES = {
  // ... existing ...
  CONTENT_GENERATION: 'contentGeneration',
  ENGAGEMENT_PROFILE_UPDATE: 'engagementProfileUpdate',
  CALENDAR_SEED: 'calendarSeed',
  WEEKLY_THEME: 'weeklyTheme',
  INSIGHT_REPORT: 'insightReport',
  VARIANT_ROTATION: 'variantRotation',
  PROMPT_OPTIMIZATION: 'promptOptimization',
  CONTENT_GAP_DETECTION: 'contentGapDetection',
  SCRIPTURE_EXHAUSTION: 'scriptureExhaustion',
  SELF_HEAL: 'selfHeal',
};
```

**File to modify:** `server/src/jobs/index.js`

**Add intelligence worker + all repeatable job registrations:**

```javascript
// Intelligence queue worker
intelligenceWorker = new Worker(
  'intelligenceQueue',
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.CONTENT_GENERATION: return processContentGeneration(job);
      case JOB_NAMES.ENGAGEMENT_PROFILE_UPDATE: return processEngagementUpdate(job);
      case JOB_NAMES.CALENDAR_SEED: return processCalendarSeed(job);
      case JOB_NAMES.WEEKLY_THEME: return processWeeklyTheme(job);
      case JOB_NAMES.INSIGHT_REPORT: return processInsightReport(job);
      case JOB_NAMES.VARIANT_ROTATION: return processVariantRotation(job);
      case JOB_NAMES.SCRIPTURE_EXHAUSTION: return processScriptureExhaustion(job);
      case JOB_NAMES.SELF_HEAL: return processSelfHeal(job);
      default: logger.warn({ message: 'Unknown intelligence job', name: job.name });
    }
  },
  { connection: createRedisConnection(), concurrency: 1 }
);

// Register repeatable jobs for intelligence queue
const intelligenceQueue = getIntelligenceQueue();

// Sunday night sequence
await intelligenceQueue.add(JOB_NAMES.CALENDAR_SEED, {}, {
  repeat: { cron: '0 22 * * 0', tz: 'Asia/Kolkata' },
  jobId: 'calendar-seed-weekly',
});

await intelligenceQueue.add(JOB_NAMES.CONTENT_GENERATION, {}, {
  repeat: { cron: '0 23 * * 0', tz: 'Asia/Kolkata' },
  jobId: 'content-gen-weekly',
});

await intelligenceQueue.add(JOB_NAMES.WEEKLY_THEME, {}, {
  repeat: { cron: '30 23 * * 0', tz: 'Asia/Kolkata' },
  jobId: 'weekly-theme-assignment',
});

// Monday morning sequence
await intelligenceQueue.add(JOB_NAMES.SCRIPTURE_EXHAUSTION, {}, {
  repeat: { cron: '0 2 * * 1', tz: 'Asia/Kolkata' },
  jobId: 'scripture-exhaustion-check',
});

await intelligenceQueue.add(JOB_NAMES.ENGAGEMENT_PROFILE_UPDATE, {}, {
  repeat: { cron: '0 3 * * *', tz: 'Asia/Kolkata' },
  jobId: 'engagement-profile-daily',
});

await intelligenceQueue.add(JOB_NAMES.SELF_HEAL, {}, {
  repeat: { cron: '0 4 * * *', tz: 'Asia/Kolkata' },
  jobId: 'self-heal-daily',
});

await intelligenceQueue.add(JOB_NAMES.VARIANT_ROTATION, {}, {
  repeat: { cron: '0 5 * * 1', tz: 'Asia/Kolkata' },
  jobId: 'variant-rotation-weekly',
});

await intelligenceQueue.add(JOB_NAMES.INSIGHT_REPORT, {}, {
  repeat: { cron: '0 6 * * 1', tz: 'Asia/Kolkata' },
  jobId: 'insight-report-weekly',
});
```

---

## Dependency Installations

**Server:**
```bash
cd server && npm install # no new deps needed — Prisma, BullMQ, Gemini SDK already present
```

**Dashboard:**
```bash
cd dashboard && npm install recharts  # for trend charts on /intelligence
```

---

## Environment Variables to Add

```env
# Add to server/.env
ADMIN_WHATSAPP_NUMBER=+91XXXXXXXXXX   # Admin phone for weekly insight WhatsApp
GEMINI_PRO_MODEL=gemini-2.5-pro       # Explicit model name for intelligence jobs
```

---

## File Creation Summary

### New Files (Server)

| File | Sprint | Purpose |
|------|--------|---------|
| `server/src/services/contentLogService.js` | S1-T2 | Content tracking |
| `server/src/services/contentPoolService.js` | S1-T4 | Content pool management |
| `server/src/services/raashifalLensService.js` | S2-T1 | 6 raashifal lenses |
| `server/src/services/scenarioSeedService.js` | S2-T2 | 50 scenario seeds |
| `server/src/services/calendarService.js` | S3-T2 | Calendar context |
| `server/src/services/engagementService.js` | S3-T3 | User profiling + tone fork |
| `server/src/services/variantService.js` | S4-T2 | A/B variant management |
| `server/src/services/selfHealingService.js` | S6-T1 | Error tracking + auto-repair |
| `server/src/services/userContentMemoryService.js` | S4-T4 | Per-user content preferences |
| `server/src/jobs/contentGenerationJob.js` | S1-T5 | Weekly content gen |
| `server/src/jobs/engagementUpdateJob.js` | S3-T4 | Daily profile update |
| `server/src/jobs/calendarSeedJob.js` | S3-T2 | Weekly calendar seed |
| `server/src/jobs/weeklyThemeJob.js` | S4-T4 | Weekly theme assignment |
| `server/src/jobs/variantRotationJob.js` | S4-T3 | Weekly variant rotation |
| `server/src/jobs/insightReportJob.js` | S5-T2 | Weekly AI report |
| `server/src/jobs/scriptureExhaustionJob.js` | S6-T3 | Scripture monitoring |
| `server/src/jobs/selfHealJob.js` | S6-T2 | Daily self-healing |
| `server/src/data/scenarioSeeds.json` | S2-T2 | 50 scenario seeds data |
| `server/src/routes/admin.js` | S1-T6 | Admin API routes |
| `server/prisma/seeds/seedVariants.js` | S4-T1 | Seed 3 initial variants |

### New Files (Dashboard)

| File | Sprint | Purpose |
|------|--------|---------|
| `dashboard/src/components/ContentPoolCard.jsx` | S1-T6 | Pool levels widget |
| `dashboard/src/components/ContentLogBadge.jsx` | S1-T7 | Content type badge |
| `dashboard/src/components/PromptVariationCard.jsx` | S2-T5 | Today's lens card |
| `dashboard/src/components/CalendarWidget.jsx` | S3-T5 | Calendar events |
| `dashboard/src/components/EngagementHeatmap.jsx` | S3-T5 | User tier distribution |
| `dashboard/src/components/ABTestingCard.jsx` | S4-T5 | Variant performance |
| `dashboard/src/components/WeeklyThemeCard.jsx` | S4-T5 | Current theme |
| `dashboard/src/components/InsightReportCard.jsx` | S5-T4 | Insight report display |
| `dashboard/src/components/TrendChart.jsx` | S5-T4 | Recharts trend charts |
| `dashboard/src/components/ApprovalQueue.jsx` | S5-T4 | Prompt rewrite approval |
| `dashboard/src/components/HealthBadge.jsx` | S6-T5 | System status badge |
| `dashboard/src/components/JobRunTable.jsx` | S6-T5 | Job history table |
| `dashboard/src/components/ErrorLogPanel.jsx` | S6-T5 | Error log display |
| `dashboard/src/components/ContentExhaustionMonitor.jsx` | S6-T5 | Exhaustion gauges |
| `dashboard/src/components/AlertsPanel.jsx` | S6-T5 | Active alerts |
| `dashboard/src/components/AlertsStrip.jsx` | S6-T5 | Dashboard alert strip |
| `dashboard/src/app/intelligence/page.jsx` | S5-T4 | Intelligence page |
| `dashboard/src/app/health/page.jsx` | S6-T5 | Health page |
| `dashboard/src/app/content/page.jsx` | S5-T5 | Content management page |

### Modified Files

| File | Sprints | Changes |
|------|---------|---------|
| `server/prisma/schema.prisma` | S1, S3, S4, S5 | Add 8 new models + User field additions |
| `server/src/services/scriptureService.js` | S1-T3 | Add `getVerseForUser()` |
| `server/src/services/dailyMessageService.js` | S1, S2, S3, S4 | Inject lens, seed, calendar, tone, variant, theme into prompt; log to ContentLog |
| `server/src/services/aiService.js` | S6-T1 | Add error logging hook |
| `server/src/prompts/daily_v2.txt` | S2-T3, S4-T4 | Add lens, seed, calendar, theme, tone placeholders |
| `server/src/config/queues.js` | S1-T5 | Add intelligenceQueue + new JOB_NAMES |
| `server/src/jobs/index.js` | S1-S6 | Add intelligenceWorker + all repeatable jobs + JobRunLog hooks |
| `server/src/jobs/streakCheckJob.js` | S6-T4 | Add streak recovery message generation |
| `server/src/routes/index.js` | S1-T6 | Register admin routes |
| `dashboard/src/app/dashboard/page.jsx` | S1-S6 | Add new widgets + nav links |
| `dashboard/src/app/history/page.jsx` | S1-T7 | Add content type badges + engagement indicators |
| `dashboard/src/app/layout.jsx` | S5-T4 | No changes needed (pages are self-contained) |

---

## Prisma Migration Sequence

Run these migrations in order across sprints:

```bash
# Sprint 1
cd server && npx prisma migrate dev --name add_content_log_and_pool

# Sprint 3
cd server && npx prisma migrate dev --name add_hindu_calendar_event

# Sprint 4
cd server && npx prisma migrate dev --name add_variants_and_themes

# Sprint 5
cd server && npx prisma migrate dev --name add_intelligence_schema
```

Alternatively, all schema changes can be batched into a single migration if implementing multiple sprints at once:
```bash
cd server && npx prisma migrate dev --name add_self_improvement_system
```
