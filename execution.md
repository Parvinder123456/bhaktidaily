# Daily Dharma — AI Self-Improvement Execution Plan

> **TL;DR:** This document turns Daily Dharma from a static content pipeline into a self-improving system. Three AI layers — Content, Personalization, and Product Intelligence — run on top of the existing BullMQ infrastructure. Real-time messages stay on `gemini-2.5-flash` (cheap, fast). Weekly analysis/generation jobs use `gemini-2.5-pro` (smart, expensive, infrequent). The system gets better every week with near-zero human intervention.
>
> **Timeline:** 6 weeks to full autonomy. Month 2-3 for self-healing.
>
> **Monthly cost at 1,000 users:** ~$12-18/month for the entire self-improvement layer.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Phase 1 — Content Self-Improvement (Week 1-2)](#2-phase-1--content-self-improvement-week-1-2)
3. [Phase 2 — Personalization Engine (Week 3-4)](#3-phase-2--personalization-engine-week-3-4)
4. [Phase 3 — Hindu Calendar Integration (Week 3)](#4-phase-3--hindu-calendar-integration-week-3)
5. [Phase 4 — 12-Week Narrative Cycle (Week 4)](#5-phase-4--12-week-narrative-cycle-week-4)
6. [Phase 5 — AI Product Intelligence (Month 2)](#6-phase-5--ai-product-intelligence-month-2)
7. [Phase 6 — Self-Healing (Month 2-3)](#7-phase-6--self-healing-month-2-3)
8. [Full Schema (Prisma Additions)](#8-full-schema-prisma-additions)
9. [Complete Job Schedule](#9-complete-job-schedule)
10. [Model Usage Guide](#10-model-usage-guide)
11. [Implementation Checklist](#11-implementation-checklist)
12. [Estimated Costs](#12-estimated-costs)

---

## 1. Overview

### What "AI Self-Improvement" Means for Daily Dharma

Today, Daily Dharma is a one-way pipeline: static prompts go into Gemini Flash, generated messages go to users. The prompts don't change, the content pool doesn't grow, and you have no idea which messages land and which ones don't.

After this execution plan, the system will:
- **Track every piece of content** sent to every user and measure engagement signals (replies, reply speed, shares)
- **Never repeat content** — verses, trivia, facts rotate with a 60-day memory
- **Grow its own content pool** — Gemini Pro generates new trivia, facts, and scripture commentary weekly
- **A/B test prompt styles** and automatically kill underperformers
- **Generate weekly insight reports** telling you exactly what's working and what's not
- **Rewrite its own prompts** when engagement drops
- **Self-heal** when content runs dry or errors spike

### The Three Layers

| Layer | Purpose | Model | Frequency |
|-------|---------|-------|-----------|
| **Content Layer** | Track, score, rotate, and generate content | Flash (realtime) + Pro (weekly gen) | Continuous + weekly |
| **Personalization Layer** | Profile users, fork tone, A/B test prompt styles | Flash (realtime) + Pro (variant rewrite) | Continuous + biweekly |
| **Product Intelligence Layer** | Analyze engagement data, rewrite prompts, detect gaps | Pro / Opus | Weekly + monthly |

### Model Assignment

| Model | Use Case | Cost |
|-------|----------|------|
| `gemini-2.5-flash` | All real-time user-facing generation: daily messages, chat, bonus content | ~$0.001/message |
| `gemini-2.5-pro` | Weekly insight reports, prompt rewriting, content generation, quality analysis | ~$0.01-0.03/call |
| `claude-opus-4-6` | Fallback for complex multi-step reasoning if Pro underperforms on insight quality | ~$0.05/call |

---

## 2. Phase 1 — Content Self-Improvement (Week 1-2)

### 2.1 ContentLog — Track Everything Sent

Every piece of content sent to a user gets logged. This is the foundation for all downstream intelligence.

**File:** `server/src/services/contentLogService.js`

```javascript
// contentLogService.js
const prisma = require('../config/database');

async function logContent({ userId, contentType, contentId, contentTag, date }) {
  return prisma.contentLog.create({
    data: { userId, contentType, contentId, contentTag, date }
  });
}

async function markReply(userId, date, contentType) {
  return prisma.contentLog.updateMany({
    where: { userId, date, contentType },
    data: { gotReply: true, replyAt: new Date() }
  });
}

async function getSeenContentIds(userId, contentType, days = 60) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const logs = await prisma.contentLog.findMany({
    where: { userId, contentType, date: { gte: cutoff } },
    select: { contentId: true }
  });
  return logs.map(l => l.contentId);
}
```

**Content types tracked:**

| contentType | contentId points to | contentTag example |
|-------------|--------------------|--------------------|
| `verse` | Scripture.id | `gita`, `hanuman_chalisa` |
| `trivia` | TriviaQuestion.id | `mythology`, `temples` |
| `fact` | ContentPool.id | `ritual`, `history` |
| `raashifal` | null (generated) | `practical`, `karmic` |
| `bhagwan_sandesh` | null (generated) | `father`, `friend`, `guru` |
| `bonus` | BonusMessage.id | `hanuman_tuesday`, `dream` |

### 2.2 History-Aware Content Selection

**Modify:** `server/src/services/scriptureService.js`

Current behavior: picks a random verse. New behavior: picks a verse the user hasn't seen in 60 days.

```javascript
// In scriptureService.js — replace getRandomVerse()
async function getVerseForUser(userId) {
  const seenIds = await contentLogService.getSeenContentIds(userId, 'verse', 60);

  const verse = await prisma.scripture.findFirst({
    where: {
      id: { notIn: seenIds.length > 0 ? seenIds : ['__none__'] }
    },
    orderBy: { createdAt: 'asc' } // oldest unseen first
  });

  // Fallback: if all verses seen, pick least-recently-seen
  if (!verse) {
    const oldestLog = await prisma.contentLog.findFirst({
      where: { userId, contentType: 'verse' },
      orderBy: { date: 'asc' }
    });
    return prisma.scripture.findFirst({
      where: { id: oldestLog?.contentId || undefined }
    });
  }

  return verse;
}
```

Apply the same pattern to trivia selection in `triviaService.js` and fact selection.

### 2.3 Raashifal Lens Rotation

Problem: Gemini generates the same style of raashifal every day — vague encouragement. Fix: rotate through 6 distinct "lenses" that force specificity.

**Lenses (cycle every 6 days):**

| Day Mod 6 | Lens | Prompt Injection |
|-----------|------|-----------------|
| 0 | `practical` | "Focus on career, money decisions, and time management. Mention specific actions: 'sign that document', 'avoid lending money today'." |
| 1 | `emotional` | "Focus on relationships — spouse, parents, children, friends. Mention a specific relational dynamic: 'resolve that old argument', 'call your mother'." |
| 2 | `karmic` | "Frame the day through karma and past-life patterns. Reference Shani, Rahu effects. Mention what past actions are bearing fruit today." |
| 3 | `health` | "Focus on physical/mental health. Mention specific advice: 'avoid heavy food after 2 PM', 'evening walk will clear confusion', 'sleep early tonight'." |
| 4 | `wealth` | "Focus on dhan and financial decisions. Be specific: 'investment ka faisla aaj mat lo', 'unexpected expense aa sakta hai', 'savings shuru karo'." |
| 5 | `spiritual` | "Focus on sadhana and inner growth. Mention specific practices: 'do 11 minutes of japa today', 'visit mandir in the evening', 'donate something small'." |

**File:** `server/src/services/raashifalLensService.js`

```javascript
const LENSES = [
  { key: 'practical', inject: 'Focus on career, money decisions, and time management. Mention specific actions.' },
  { key: 'emotional', inject: 'Focus on relationships — spouse, parents, children, friends. Mention a specific relational dynamic.' },
  { key: 'karmic', inject: 'Frame the day through karma and past-life patterns. Reference planetary effects.' },
  { key: 'health', inject: 'Focus on physical and mental health. Mention specific wellness advice.' },
  { key: 'wealth', inject: 'Focus on dhan and financial decisions. Be specific about money.' },
  { key: 'spiritual', inject: 'Focus on sadhana and inner growth. Mention specific practices.' },
];

function getLensForDate(date) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  return LENSES[dayOfYear % LENSES.length];
}

module.exports = { getLensForDate, LENSES };
```

**Inject into** `server/src/prompts/daily_v2.txt`:

Add after the panchang section:
```
Today's Raashifal Lens: {raashifalLens}
{raashifalLensInstruction}
```

### 2.4 Scenario Seed Injection

Problem: Gemini has a "house style" — it uses the same phrases, same structure, same emotional register. After 2 weeks, messages feel same-same.

Fix: inject a random "micro-scenario" seed into the prompt that forces Gemini to ground the prediction in a specific life situation.

**File:** `server/src/data/scenarioSeeds.json` (50 seeds)

```json
[
  "User is a working professional stressed about a promotion decision",
  "User is a student preparing for competitive exams",
  "User had a fight with a family member yesterday",
  "User is planning a wedding in the family",
  "User recently lost someone close",
  "User is considering a job change",
  "User is a new parent dealing with sleepless nights",
  "User is dealing with health anxiety",
  "User has been procrastinating on an important task",
  "User is feeling disconnected from their spiritual practice",
  "User is going through a financial crunch",
  "User is celebrating a personal achievement",
  "User is worried about their child's career",
  "User is dealing with office politics",
  "User recently moved to a new city",
  "User is managing a family business dispute",
  "User is feeling lonely in a crowd",
  "User is about to start something new — business or venture",
  "User is caring for an elderly parent",
  "User is dealing with a broken friendship",
  "User just got married and adjusting to new family",
  "User is handling multiple responsibilities alone",
  "User has been having disturbing dreams lately",
  "User is about to make a large purchase — house or car",
  "User is questioning their life purpose",
  "User is recovering from illness",
  "User has exam results coming soon",
  "User is trying to break a bad habit",
  "User is feeling jealous of a peer's success",
  "User is managing long-distance relationship",
  "User just started a new job",
  "User is worried about aging parents' health",
  "User has a court case or legal matter pending",
  "User is trying to conceive",
  "User is dealing with in-law conflicts",
  "User recently got a salary hike and wondering how to invest",
  "User is homesick living abroad",
  "User is fasting today for spiritual reasons",
  "User is planning a pilgrimage or tirth yatra",
  "User is dealing with debt",
  "User is thinking about retirement planning",
  "User has been helping someone who doesn't appreciate it",
  "User is dealing with a child's rebellious phase",
  "User is struggling with weight and body image",
  "User is about to give a public presentation",
  "User recently experienced a betrayal of trust",
  "User is considering an arranged marriage proposal",
  "User is dealing with addiction in the family",
  "User has been working without a vacation for months",
  "User is feeling spiritually awakened and seeking deeper knowledge"
]
```

**Inject into prompt:** Pick one random seed per user per day (deterministic using userId + date as hash seed).

```javascript
// In dailyMessageService.js
const crypto = require('crypto');
const seeds = require('../data/scenarioSeeds.json');

function getScenarioSeed(userId, dateStr) {
  const hash = crypto.createHash('md5').update(userId + dateStr).digest('hex');
  const index = parseInt(hash.slice(0, 8), 16) % seeds.length;
  return seeds[index];
}
```

Add to prompt: `"Imagine this user's situation today: {scenarioSeed}. Let this subtly color the raashifal and sandesh — but do NOT mention the scenario explicitly."`

### 2.5 Weekly Auto-Generation Job

Every Sunday at 11 PM IST, Gemini Pro generates new content and adds it to the `ContentPool` table.

**File:** `server/src/jobs/contentGenerationJob.js`

```javascript
const { getClient } = require('../config/gemini');
const prisma = require('../config/database');
const logger = require('../utils/logger');

const PRO_MODEL = 'gemini-2.5-pro';

async function processContentGeneration(job) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: PRO_MODEL });

  // --- Generate 5 new trivia questions ---
  const triviaPrompt = `Generate 5 new Hindu trivia questions in this exact JSON format:
[{
  "question": "Hindi question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answerIndex": 0,
  "explanation": "Hindi explanation (2 lines)",
  "tags": ["mythology", "temples", "festivals", "scriptures", "rituals"]
}]

Requirements:
- Questions must be about Hindu dharma, mythology, temples, festivals, or scriptures
- Difficulty: medium — not too easy, not academic
- Hindi language, Hinglish acceptable
- Each question must have exactly 4 options
- Do NOT repeat these existing questions: ${await getRecentTriviaTopics()}
- Output ONLY valid JSON array, no markdown fences`;

  const triviaResult = await model.generateContent(triviaPrompt);
  const triviaText = triviaResult.response.text();
  const triviaQuestions = JSON.parse(cleanJson(triviaText));

  for (const q of triviaQuestions) {
    await prisma.triviaQuestion.create({
      data: {
        question: q.question,
        options: q.options,
        answerIndex: q.answerIndex,
        explanation: q.explanation,
      }
    });
  }

  // --- Generate 3 new "Kya Aap Jaante Hain" facts ---
  const factsPrompt = `Generate 3 fascinating Hindu religious facts for a WhatsApp feature called "Kya Aap Jaante Hain?"

JSON format:
[{
  "content": "Hindi fact text (3-4 lines, conversational Hinglish)",
  "tags": ["temples", "rituals", "history", "science", "mythology"],
  "source": "Reference or scripture name"
}]

Requirements:
- Surprising, share-worthy facts that make people forward the message
- Mix of: temple facts, ritual meanings, scientific aspects of Hindu practices, historical facts
- Hindi/Hinglish, warm tone
- Output ONLY valid JSON array`;

  const factsResult = await model.generateContent(factsPrompt);
  const factsText = factsResult.response.text();
  const facts = JSON.parse(cleanJson(factsText));

  for (const f of facts) {
    await prisma.contentPool.create({
      data: {
        type: 'fact',
        content: f.content,
        tags: f.tags,
        source: f.source,
        generatedBy: 'gemini-2.5-pro',
      }
    });
  }

  // --- Generate 4 Hanuman Chalisa chaupais with commentary ---
  const hanumanPrompt = `Generate 4 Hanuman Chalisa chaupai entries for a Tuesday WhatsApp special.

JSON format:
[{
  "chaupai": "Original chaupai text in Hindi",
  "meaning": "Simple Hindi meaning (2 lines)",
  "lifeLesson": "How to apply this in modern life (2-3 lines, Hinglish)",
  "tags": ["hanuman", "chalisa", "devotion"]
}]

Requirements:
- Each chaupai must be a real Hanuman Chalisa verse (not made up)
- Life lesson should connect to real modern situations
- Warm, practical tone — not preachy
- Output ONLY valid JSON array`;

  const hanumanResult = await model.generateContent(hanumanPrompt);
  const hanumanText = hanumanResult.response.text();
  const chaupais = JSON.parse(cleanJson(hanumanText));

  for (const c of chaupais) {
    await prisma.contentPool.create({
      data: {
        type: 'hanuman_chaupai',
        content: JSON.stringify(c),
        tags: c.tags,
        source: 'Hanuman Chalisa',
        generatedBy: 'gemini-2.5-pro',
      }
    });
  }

  logger.info({
    message: 'Weekly content generation complete',
    triviaAdded: triviaQuestions.length,
    factsAdded: facts.length,
    chaupaisAdded: chaupais.length,
  });

  return { triviaAdded: triviaQuestions.length, factsAdded: facts.length, chaupaisAdded: chaupais.length };
}

function cleanJson(text) {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function getRecentTriviaTopics() {
  const recent = await prisma.triviaQuestion.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    select: { question: true }
  });
  return recent.map(q => q.question).join('; ');
}

module.exports = { processContentGeneration };
```

### 2.6 Quality Scoring

Content that gets replies scores higher and gets picked more often.

**Logic in `contentLogService.js`:**

```javascript
async function getContentScores(contentType, limit = 50) {
  // Aggregate reply rate per contentId
  const scores = await prisma.contentLog.groupBy({
    by: ['contentId'],
    where: {
      contentType,
      contentId: { not: null }
    },
    _count: { id: true },
    _sum: { gotReply: true }, // gotReply is Boolean, sum = count of trues
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  return scores.map(s => ({
    contentId: s.contentId,
    totalSent: s._count.id,
    totalReplies: s._sum.gotReply || 0,
    replyRate: s._sum.gotReply ? s._sum.gotReply / s._count.id : 0,
  }));
}

// Weighted random selection: higher replyRate = higher pick probability
async function pickWeightedContent(userId, contentType, candidates) {
  const seenIds = await getSeenContentIds(userId, contentType, 60);
  const unseen = candidates.filter(c => !seenIds.includes(c.id));

  if (unseen.length === 0) return candidates[0]; // fallback

  const scores = await getContentScores(contentType);
  const scoreMap = Object.fromEntries(scores.map(s => [s.contentId, s.replyRate]));

  // Weight = baseWeight (1.0) + replyRate bonus (0-1.0)
  const weighted = unseen.map(c => ({
    ...c,
    weight: 1.0 + (scoreMap[c.id] || 0)
  }));

  const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const c of weighted) {
    random -= c.weight;
    if (random <= 0) return c;
  }

  return weighted[weighted.length - 1];
}
```

---

## 3. Phase 2 — Personalization Engine (Week 3-4)

### 3.1 User Engagement Profiling

Track engagement signals and build a profile for each user.

**Add to User model:** `engagementProfile Json?`

**File:** `server/src/services/engagementService.js`

```javascript
const prisma = require('../config/database');

async function updateEngagementProfile(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  // Count messages sent and replied to
  const logs = await prisma.contentLog.findMany({
    where: { userId, date: { gte: thirtyDaysAgo } }
  });

  const totalSent = logs.length;
  const totalReplied = logs.filter(l => l.gotReply).length;
  const replyRate = totalSent > 0 ? totalReplied / totalSent : 0;

  // Average reply speed (minutes)
  const repliedLogs = logs.filter(l => l.gotReply && l.replyAt);
  const avgReplyMinutes = repliedLogs.length > 0
    ? repliedLogs.reduce((sum, l) => sum + (l.replyAt - l.date) / 60000, 0) / repliedLogs.length
    : null;

  // Active hours (which hour do they reply most?)
  const hourCounts = {};
  repliedLogs.forEach(l => {
    const hour = new Date(l.replyAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Streak data from User model
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { streakCount: true } });

  const profile = {
    replyRate: Math.round(replyRate * 100) / 100,
    avgReplyMinutes: avgReplyMinutes ? Math.round(avgReplyMinutes) : null,
    peakHour: peakHour ? parseInt(peakHour) : null,
    totalMessages30d: totalSent,
    streakCount: user?.streakCount || 0,
    tier: replyRate >= 0.3 ? 'high' : replyRate >= 0.1 ? 'medium' : 'low',
    updatedAt: new Date().toISOString(),
  };

  await prisma.user.update({
    where: { id: userId },
    data: { engagementProfile: profile }
  });

  return profile;
}

module.exports = { updateEngagementProfile };
```

### 3.2 High-Engage vs Low-Engage Tone Fork

Based on `engagementProfile.tier`, inject different tone instructions into the daily prompt.

| Tier | Reply Rate | Tone Strategy | Example Injection |
|------|-----------|---------------|-------------------|
| `high` (>30%) | Active responder | Ask questions, create dialogue, use cliffhangers | "End the Bhagwan Sandesh with a question for the user to reflect on. Example: 'Beta, aaj sochna — woh kaunsi cheez hai jo tumhe rok rahi hai?'" |
| `medium` (10-30%) | Occasional responder | Mix of punchy statements and light questions | "Keep the tone warm and shareable. Occasionally ask a gentle question." |
| `low` (<10%) | Silent reader | Punchy, shareable, no questions (they won't answer) | "Make every line quotable and share-worthy. No questions. Think WhatsApp status material. Short, powerful, forward-worthy." |

**File:** `server/src/services/toneForkService.js`

```javascript
const TONE_INJECTIONS = {
  high: `This user actively replies. End Bhagwan Sandesh with a personal reflective question.
Use phrases like "aaj sochna...", "mujhe batao...", "kya tumne notice kiya...".
Create a gentle dialogue — they WILL respond.`,

  medium: `This user sometimes responds. Keep tone warm and shareable.
One in every 3 messages, ask a light question. Otherwise, be punchy and quotable.`,

  low: `This user rarely replies but reads every message. Do NOT ask questions — they won't answer.
Make every line quotable, shareable, WhatsApp-status-worthy.
Think: "screenshot and share on family group" energy. Short, powerful, no fluff.`,
};

function getToneInjection(engagementProfile) {
  const tier = engagementProfile?.tier || 'medium';
  return TONE_INJECTIONS[tier] || TONE_INJECTIONS.medium;
}

module.exports = { getToneInjection };
```

### 3.3 A/B Testing with PromptVariant Table

Test 3 different Bhagwan Sandesh "voices" simultaneously.

**Initial Variants:**

| ID | Style | System Instruction Snippet |
|----|-------|---------------------------|
| `father` | Loving parent | "Speak as a father who has seen everything. Gentle, protective, knowing. Use 'beta', 'mere bachche'. Like a father giving life advice at the dinner table." |
| `friend` | Wise friend | "Speak as a wise friend — not above them, alongside them. Use 'yaar', 'dekh bhai/behen'. Like a phone call with someone who gets it." |
| `guru` | Spiritual teacher | "Speak as a guru — calm, centered, slightly mystical. Use 'shishya', 'sadhak'. Like sitting in an ashram at dawn. Deeper, more philosophical." |

**File:** `server/src/services/promptVariantService.js`

```javascript
const prisma = require('../config/database');

async function assignVariant(userId) {
  // Check if user already has a variant
  const existing = await prisma.userPromptVariant.findFirst({
    where: { userId, featureKey: 'bhagwan_sandesh' }
  });
  if (existing) return existing.variantId;

  // Get active variants with user counts
  const variants = await prisma.promptVariant.findMany({
    where: { featureKey: 'bhagwan_sandesh', isActive: true },
    include: { _count: { select: { userAssignments: true } } }
  });

  // Assign to variant with fewest users (balanced distribution)
  variants.sort((a, b) => a._count.userAssignments - b._count.userAssignments);
  const chosen = variants[0];

  await prisma.userPromptVariant.create({
    data: { userId, variantId: chosen.id, featureKey: 'bhagwan_sandesh' }
  });

  return chosen.id;
}

async function getVariantPrompt(variantId) {
  const variant = await prisma.promptVariant.findUnique({ where: { id: variantId } });
  return variant?.promptText || null;
}

module.exports = { assignVariant, getVariantPrompt };
```

### 3.4 Variant Rotation Job — Weekly Optimization

Every Monday at 5 AM IST, the system evaluates variant performance and shifts users from losers to winners.

**File:** `server/src/jobs/variantRotationJob.js`

```javascript
const prisma = require('../config/database');
const logger = require('../utils/logger');

async function processVariantRotation(job) {
  const featureKey = 'bhagwan_sandesh';
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  // Get reply rates per variant over last 7 days
  const variants = await prisma.promptVariant.findMany({
    where: { featureKey, isActive: true }
  });

  const variantStats = [];

  for (const variant of variants) {
    const assignedUsers = await prisma.userPromptVariant.findMany({
      where: { variantId: variant.id },
      select: { userId: true }
    });
    const userIds = assignedUsers.map(a => a.userId);

    if (userIds.length === 0) {
      variantStats.push({ variant, replyRate: 0, userCount: 0 });
      continue;
    }

    const logs = await prisma.contentLog.findMany({
      where: {
        userId: { in: userIds },
        contentType: 'bhagwan_sandesh',
        date: { gte: sevenDaysAgo }
      }
    });

    const total = logs.length;
    const replied = logs.filter(l => l.gotReply).length;

    variantStats.push({
      variant,
      replyRate: total > 0 ? replied / total : 0,
      userCount: userIds.length,
    });
  }

  // Sort: best performer first
  variantStats.sort((a, b) => b.replyRate - a.replyRate);

  const best = variantStats[0];
  const worst = variantStats[variantStats.length - 1];

  if (variantStats.length < 2 || best.replyRate === worst.replyRate) {
    logger.info({ message: 'Variant rotation: no clear winner, skipping' });
    return { action: 'skipped' };
  }

  // Move 20% of worst variant's users to best variant
  const usersToMove = Math.max(1, Math.floor(worst.userCount * 0.2));

  const worstUsers = await prisma.userPromptVariant.findMany({
    where: { variantId: worst.variant.id },
    take: usersToMove,
    orderBy: { assignedAt: 'asc' } // move oldest assignments first
  });

  for (const assignment of worstUsers) {
    await prisma.userPromptVariant.update({
      where: { id: assignment.id },
      data: { variantId: best.variant.id }
    });
  }

  // Update variant scores
  for (const stat of variantStats) {
    await prisma.promptVariant.update({
      where: { id: stat.variant.id },
      data: { lastReplyRate: stat.replyRate, lastEvaluatedAt: new Date() }
    });
  }

  logger.info({
    message: 'Variant rotation complete',
    best: { id: best.variant.id, style: best.variant.style, replyRate: best.replyRate },
    worst: { id: worst.variant.id, style: worst.variant.style, replyRate: worst.replyRate },
    usersMoved: usersToMove,
  });

  return { best: best.variant.style, worst: worst.variant.style, moved: usersToMove };
}

module.exports = { processVariantRotation };
```

### 3.5 Per-User Content Memory

Track which themes, deities, and scriptures each user responds to most.

**File:** `server/src/services/userContentMemoryService.js`

```javascript
const prisma = require('../config/database');

async function getUserContentPreferences(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  // Get all replied-to content tags
  const repliedLogs = await prisma.contentLog.findMany({
    where: {
      userId,
      gotReply: true,
      date: { gte: thirtyDaysAgo },
      contentTag: { not: null }
    },
    select: { contentTag: true }
  });

  // Count tag frequency
  const tagCounts = {};
  repliedLogs.forEach(l => {
    tagCounts[l.contentTag] = (tagCounts[l.contentTag] || 0) + 1;
  });

  // Sort by frequency
  const sorted = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    topTags: sorted.map(([tag, count]) => ({ tag, count })),
    totalReplies: repliedLogs.length,
  };
}

// Generate a preference string for prompt injection
async function getPreferenceInjection(userId) {
  const prefs = await getUserContentPreferences(userId);
  if (prefs.topTags.length === 0) return '';

  const tags = prefs.topTags.map(t => t.tag).join(', ');
  return `This user responds most to content about: ${tags}. Subtly lean into these themes when natural.`;
}

module.exports = { getUserContentPreferences, getPreferenceInjection };
```

---

## 4. Phase 3 — Hindu Calendar Integration (Week 3)

### 4.1 HinduCalendarEvent Table

Seeded weekly by a BullMQ job that derives events from panchang data.

**Key Event Types:**

| Event Type | Examples | How It Affects Daily Message |
|------------|----------|------------------------------|
| `ekadashi` | Nirjala Ekadashi, Vaikuntha Ekadashi | Add fasting tip, Vishnu connection |
| `amavasya` | Monthly new moon | Pitru tarpan reminder, ancestral theme |
| `purnima` | Monthly full moon | Satyanarayan katha, gratitude theme |
| `navratri` | Chaitra/Sharad Navratri | Devi focus, specific day's Devi |
| `day_deity` | Monday=Shiva, Tue=Hanuman, Thu=Brihaspati | Subtle deity reference in sandesh |
| `ritu` | Vasant, Grishma, Varsha, Sharad, Hemant, Shishir | Seasonal spiritual practices |
| `major_festival` | Diwali, Holi, Janmashtami, Ganesh Chaturthi | Full festival mode override |

### 4.2 Calendar Seeding Job

**File:** `server/src/jobs/calendarSeedJob.js`

```javascript
const prisma = require('../config/database');
const logger = require('../utils/logger');

// Day-deity mapping (fixed)
const DAY_DEITIES = {
  0: { deity: 'Surya', theme: 'vitality, father figures, leadership' },
  1: { deity: 'Shiva', theme: 'discipline, detachment, inner strength' },
  2: { deity: 'Hanuman', theme: 'courage, devotion, overcoming obstacles' },
  3: { deity: 'Ganesh/Budh', theme: 'wisdom, communication, new beginnings' },
  4: { deity: 'Brihaspati/Vishnu', theme: 'knowledge, guru, expansion, dharma' },
  5: { deity: 'Shukra/Lakshmi', theme: 'beauty, love, prosperity, gratitude' },
  6: { deity: 'Shani', theme: 'karma, patience, justice, hard work' },
};

// Ritu (season) detection based on Hindu solar months
function getRitu(date) {
  const month = date.getMonth(); // 0-indexed
  // Approximate mapping for common year
  if (month === 2 || month === 3) return { ritu: 'Vasant', theme: 'renewal, growth, new beginnings, Saraswati' };
  if (month === 4 || month === 5) return { ritu: 'Grishma', theme: 'tapasya, endurance, Surya worship' };
  if (month === 6 || month === 7) return { ritu: 'Varsha', theme: 'fertility, patience, Krishna leela' };
  if (month === 8 || month === 9) return { ritu: 'Sharad', theme: 'clarity, Devi worship, Navratri energy' };
  if (month === 10 || month === 11) return { ritu: 'Hemant', theme: 'introspection, Gita jayanti, inner fire' };
  return { ritu: 'Shishir', theme: 'stillness, Makar Sankranti, ancestors' };
}

async function processCalendarSeed(job) {
  const startDate = new Date();
  const events = [];

  // Generate next 7 days of calendar events
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateOnly = date.toISOString().split('T')[0];

    // Day deity
    const dayInfo = DAY_DEITIES[date.getDay()];
    events.push({
      date: new Date(dateOnly),
      eventType: 'day_deity',
      name: `${dayInfo.deity} Day`,
      metadata: dayInfo,
    });

    // Ritu
    const ritu = getRitu(date);
    events.push({
      date: new Date(dateOnly),
      eventType: 'ritu',
      name: ritu.ritu,
      metadata: ritu,
    });
  }

  // Upsert events (avoid duplicates)
  for (const event of events) {
    await prisma.hinduCalendarEvent.upsert({
      where: {
        date_eventType_name: {
          date: event.date,
          eventType: event.eventType,
          name: event.name,
        }
      },
      update: { metadata: event.metadata },
      create: event,
    });
  }

  logger.info({ message: 'Calendar events seeded', count: events.length });
  return { eventsSeeded: events.length };
}

module.exports = { processCalendarSeed };
```

### 4.3 Injecting Calendar Context Into Daily Prompts

**Modify:** `server/src/services/dailyMessageService.js`

```javascript
async function getCalendarContext(date) {
  const events = await prisma.hinduCalendarEvent.findMany({
    where: {
      date: {
        gte: new Date(date.toISOString().split('T')[0]),
        lt: new Date(new Date(date).setDate(date.getDate() + 1))
      }
    }
  });

  if (events.length === 0) return '';

  const lines = events.map(e => {
    const meta = e.metadata;
    if (e.eventType === 'day_deity') return `Today's deity: ${meta.deity}. Theme: ${meta.theme}.`;
    if (e.eventType === 'ritu') return `Current Ritu: ${meta.ritu}. Seasonal energy: ${meta.theme}.`;
    if (e.eventType === 'ekadashi') return `TODAY IS EKADASHI. Focus on Vishnu devotion, fasting, and spiritual discipline.`;
    if (e.eventType === 'purnima') return `TODAY IS PURNIMA. Full moon energy — gratitude, completion, and Satyanarayan.`;
    if (e.eventType === 'amavasya') return `TODAY IS AMAVASYA. Honor ancestors, pitru tarpan, introspection.`;
    return `Special: ${e.name} — ${meta?.theme || ''}`;
  });

  return `\n\nHindu Calendar Context for today:\n${lines.join('\n')}`;
}
```

Add `{calendarContext}` to `daily_v2.txt` prompt template.

---

## 5. Phase 4 — 12-Week Narrative Cycle (Week 4)

### 5.1 The Full 12-Week Cycle

Each week has a guiding spiritual theme that subtly shapes all daily messages, creating a narrative arc across 3 months.

| Week | Theme (Sanskrit) | Theme (English) | Core Teaching |
|------|-----------------|-----------------|---------------|
| 1 | **Shraddha** | Faith | "Vishwas rakhna seekho — khud par, Bhagwan par, apni journey par." |
| 2 | **Karma** | Action | "Karm karo, phal ki chinta mat karo — but karm SAHI karo." |
| 3 | **Shakti** | Inner Strength | "Tumhare andar woh shakti hai jo pahaad hila sakti hai." |
| 4 | **Dhairya** | Patience | "Sabr ka phal meetha hota hai — par sabr karna sabse mushkil hai." |
| 5 | **Bhakti** | Devotion | "Bhakti sirf mandir mein nahi — har kaam mein Bhagwan ko yaad rakhna bhakti hai." |
| 6 | **Viveka** | Discernment | "Sahi aur galat mein fark karna — yahi asli gyan hai." |
| 7 | **Seva** | Selfless Service | "Jab tum dusron ke liye jeete ho, tab Bhagwan tumhare liye jeete hain." |
| 8 | **Vairagya** | Detachment | "Chhod dena seekho — woh hi asli takat hai." |
| 9 | **Satya** | Truth | "Sachhai se bada koi dharm nahi, jhooth se badi koi paap nahi." |
| 10 | **Kshama** | Forgiveness | "Maaf karna kamzori nahi — yeh sabse badi himmat ka kaam hai." |
| 11 | **Ananda** | Joy | "Anand bahar se nahi milta — yeh tumhare andar hai, bas dhundho." |
| 12 | **Moksha** | Liberation | "Sabse badi azaadi — apne mann ki chains se azaad hona." |

### 5.2 Arc Progression Within Each Week

Each week follows a 4-beat storytelling arc within the 7 days:

| Days | Beat | What It Does |
|------|------|-------------|
| Mon-Tue | **Introduce** | Present the theme gently. "Is hafte ka sandesh: Shraddha. Aaj se hum vishwas ki baat karenge." |
| Wed-Thu | **Explore** | Go deeper. Share stories, examples, real-life connections. "Hanuman ki Shraddha dekho — bina proof ke Ram par bharosa." |
| Fri-Sat | **Challenge** | Poke at the user's comfort zone. "Kya sach mein tum vishwas rakhte ho? Ya sirf kahte ho?" |
| Sun | **Resolve** | Tie it together. "Ek hafte mein tumne dekha — Shraddha matlab kya hai. Yaad rakhna." |

### 5.3 WeeklyTheme Table and Job

**File:** `server/src/jobs/weeklyThemeJob.js`

```javascript
const prisma = require('../config/database');
const logger = require('../utils/logger');

const THEMES = [
  { week: 1, sanskrit: 'Shraddha', english: 'Faith', teaching: 'Vishwas rakhna seekho — khud par, Bhagwan par, apni journey par.' },
  { week: 2, sanskrit: 'Karma', english: 'Action', teaching: 'Karm karo, phal ki chinta mat karo — but karm SAHI karo.' },
  { week: 3, sanskrit: 'Shakti', english: 'Inner Strength', teaching: 'Tumhare andar woh shakti hai jo pahaad hila sakti hai.' },
  { week: 4, sanskrit: 'Dhairya', english: 'Patience', teaching: 'Sabr ka phal meetha hota hai — par sabr karna sabse mushkil hai.' },
  { week: 5, sanskrit: 'Bhakti', english: 'Devotion', teaching: 'Bhakti sirf mandir mein nahi — har kaam mein Bhagwan ko yaad rakhna.' },
  { week: 6, sanskrit: 'Viveka', english: 'Discernment', teaching: 'Sahi aur galat mein fark karna — yahi asli gyan hai.' },
  { week: 7, sanskrit: 'Seva', english: 'Selfless Service', teaching: 'Jab tum dusron ke liye jeete ho, tab Bhagwan tumhare liye jeete hain.' },
  { week: 8, sanskrit: 'Vairagya', english: 'Detachment', teaching: 'Chhod dena seekho — woh hi asli takat hai.' },
  { week: 9, sanskrit: 'Satya', english: 'Truth', teaching: 'Sachhai se bada koi dharm nahi.' },
  { week: 10, sanskrit: 'Kshama', english: 'Forgiveness', teaching: 'Maaf karna kamzori nahi — sabse badi himmat.' },
  { week: 11, sanskrit: 'Ananda', english: 'Joy', teaching: 'Anand bahar se nahi milta — tumhare andar hai.' },
  { week: 12, sanskrit: 'Moksha', english: 'Liberation', teaching: 'Sabse badi azaadi — mann ki chains se azaad hona.' },
];

function getArcBeat(dayOfWeek) {
  // dayOfWeek: 0=Sun, 1=Mon ... 6=Sat
  if (dayOfWeek === 1 || dayOfWeek === 2) return 'introduce';
  if (dayOfWeek === 3 || dayOfWeek === 4) return 'explore';
  if (dayOfWeek === 5 || dayOfWeek === 6) return 'challenge';
  if (dayOfWeek === 0) return 'resolve';
  return 'explore';
}

const ARC_INSTRUCTIONS = {
  introduce: 'INTRODUCE this week\'s theme gently. Present it as a new idea to sit with. Be warm, inviting, curious.',
  explore: 'EXPLORE the theme deeper. Use stories from Hindu epics, real-life examples, analogies. Build understanding.',
  challenge: 'CHALLENGE the user on this theme. Gently poke at comfort zones. Ask uncomfortable truths. Be direct but loving.',
  resolve: 'RESOLVE and SUMMARIZE the week\'s theme. Tie all the threads together. Leave them with one powerful takeaway.',
};

async function processWeeklyTheme(job) {
  const users = await prisma.user.findMany({
    where: { isOnboarded: true },
    select: { id: true, contentCycleWeek: true }
  });

  for (const user of users) {
    const currentWeek = (user.contentCycleWeek || 0) + 1;
    const cycleWeek = ((currentWeek - 1) % 12) + 1; // 1-12 loop
    const cycle = Math.ceil(currentWeek / 12); // which 12-week cycle
    const theme = THEMES[cycleWeek - 1];

    await prisma.weeklyTheme.create({
      data: {
        userId: user.id,
        weekNumber: currentWeek,
        cycleWeek,
        cycle,
        themeSanskrit: theme.sanskrit,
        themeEnglish: theme.english,
        teaching: theme.teaching,
        startsAt: new Date(),
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        contentCycleWeek: currentWeek,
        lastThemeTag: theme.sanskrit.toLowerCase(),
      }
    });
  }

  logger.info({ message: 'Weekly themes assigned', userCount: users.length });
  return { usersUpdated: users.length };
}

module.exports = { processWeeklyTheme, getArcBeat, ARC_INSTRUCTIONS, THEMES };
```

### 5.4 Theme Injection Into Daily Prompts

Add to `daily_v2.txt`:

```
WEEKLY SPIRITUAL JOURNEY:
This week's theme: {themeSanskrit} ({themeEnglish})
Core teaching: "{teaching}"
Today's narrative beat: {arcBeat}
Arc instruction: {arcInstruction}

{cycleDepthNote}

Weave this theme SUBTLY into the Raashifal and Bhagwan Sandesh. Don't mention "is hafte ka theme" explicitly — let it color the message naturally.
```

**Second-cycle depth note** (when `cycle >= 2`):
```
This user has been through this theme before in a previous cycle.
Assume they understood the basics. Go DEEPER this time.
Instead of "Shraddha means faith", try "You know what Shraddha is — now let's talk about Shraddha when everything is falling apart."
Reference their spiritual growth. They are not beginners anymore.
```

---

## 6. Phase 5 — AI Product Intelligence (Month 2)

This is the "heavy model" layer. Runs infrequently, uses expensive models, produces high-leverage insights.

### 6.1 Weekly Insight Report Job

**Runs:** Monday 6:00 AM IST
**Model:** `gemini-2.5-pro`
**File:** `server/src/jobs/insightReportJob.js`

```javascript
const { getClient } = require('../config/gemini');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const { sendWhatsAppMessage } = require('../services/twilioService');

const PRO_MODEL = 'gemini-2.5-pro';

async function processInsightReport(job) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  // --- Gather data ---

  // 1. Reply rates by rashi
  const rashiStats = await prisma.$queryRaw`
    SELECT u.rashi,
           COUNT(cl.id) as total_sent,
           SUM(CASE WHEN cl."gotReply" THEN 1 ELSE 0 END) as total_replied
    FROM "ContentLog" cl
    JOIN "User" u ON cl."userId" = u.id
    WHERE cl.date >= ${sevenDaysAgo}
    GROUP BY u.rashi
    ORDER BY u.rashi
  `;

  // 2. Reply rates by content type
  const contentTypeStats = await prisma.$queryRaw`
    SELECT "contentType",
           COUNT(id) as total_sent,
           SUM(CASE WHEN "gotReply" THEN 1 ELSE 0 END) as total_replied
    FROM "ContentLog"
    WHERE date >= ${sevenDaysAgo}
    GROUP BY "contentType"
  `;

  // 3. Streak distribution
  const streakStats = await prisma.$queryRaw`
    SELECT
      CASE
        WHEN "streakCount" = 0 THEN '0 (inactive)'
        WHEN "streakCount" BETWEEN 1 AND 3 THEN '1-3 (new)'
        WHEN "streakCount" BETWEEN 4 AND 7 THEN '4-7 (building)'
        WHEN "streakCount" BETWEEN 8 AND 21 THEN '8-21 (committed)'
        WHEN "streakCount" BETWEEN 22 AND 40 THEN '22-40 (dedicated)'
        ELSE '40+ (devotee)'
      END as bucket,
      COUNT(id) as user_count
    FROM "User"
    WHERE "isOnboarded" = true
    GROUP BY bucket
  `;

  // 4. Best performing bonus day
  const bonusDayStats = await prisma.$queryRaw`
    SELECT EXTRACT(DOW FROM cl.date) as day_of_week,
           COUNT(cl.id) as total_sent,
           SUM(CASE WHEN cl."gotReply" THEN 1 ELSE 0 END) as total_replied
    FROM "ContentLog" cl
    WHERE cl.date >= ${sevenDaysAgo}
      AND cl."contentType" IN ('trivia', 'fact', 'bonus')
    GROUP BY day_of_week
    ORDER BY total_replied DESC
  `;

  // 5. Variant performance
  const variantStats = await prisma.promptVariant.findMany({
    where: { featureKey: 'bhagwan_sandesh', isActive: true },
    select: { id: true, style: true, lastReplyRate: true }
  });

  // 6. Total active users
  const activeUsers = await prisma.user.count({
    where: { isOnboarded: true, lastInteraction: { gte: sevenDaysAgo } }
  });

  const totalUsers = await prisma.user.count({ where: { isOnboarded: true } });

  // --- Build prompt for Gemini Pro ---
  const dataPayload = JSON.stringify({
    period: `${sevenDaysAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
    activeUsers,
    totalUsers,
    retentionRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
    rashiStats: rashiStats.map(r => ({
      rashi: r.rashi,
      sent: Number(r.total_sent),
      replied: Number(r.total_replied),
      replyRate: r.total_sent > 0 ? Math.round((r.total_replied / r.total_sent) * 100) : 0,
    })),
    contentTypeStats: contentTypeStats.map(c => ({
      type: c.contentType,
      sent: Number(c.total_sent),
      replied: Number(c.total_replied),
      replyRate: c.total_sent > 0 ? Math.round((c.total_replied / c.total_sent) * 100) : 0,
    })),
    streakDistribution: streakStats,
    bonusDayPerformance: bonusDayStats,
    variantPerformance: variantStats,
  }, null, 2);

  const analysisPrompt = `You are an AI product analyst for "Daily Dharma", a Hindu spiritual WhatsApp companion app.

Here is the engagement data from the last 7 days:
${dataPayload}

Analyze this data and respond in EXACTLY this JSON format:
{
  "observations": [
    "Observation 1 — specific, data-backed, actionable",
    "Observation 2",
    "Observation 3"
  ],
  "promptChanges": [
    {
      "target": "which prompt or feature to change",
      "currentIssue": "what's wrong",
      "suggestedChange": "specific change to make",
      "expectedImpact": "what improvement to expect"
    },
    {
      "target": "...",
      "currentIssue": "...",
      "suggestedChange": "...",
      "expectedImpact": "..."
    }
  ],
  "featureIdea": {
    "name": "Feature name",
    "description": "What it does",
    "rationale": "Why the data suggests this",
    "effort": "low/medium/high"
  },
  "alerts": ["Any concerning trends that need immediate attention"]
}

Be specific. Reference actual numbers. Don't be generic. Think like a growth PM at a 10-person startup.
Output ONLY valid JSON.`;

  const client = getClient();
  const model = client.getGenerativeModel({ model: PRO_MODEL });
  const result = await model.generateContent(analysisPrompt);
  const analysisText = result.response.text();
  const analysis = JSON.parse(analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

  // --- Save to InsightReport ---
  const report = await prisma.insightReport.create({
    data: {
      period: `${sevenDaysAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
      rawData: JSON.parse(dataPayload),
      observations: analysis.observations,
      promptChanges: analysis.promptChanges,
      featureIdea: analysis.featureIdea,
      alerts: analysis.alerts || [],
      model: PRO_MODEL,
    }
  });

  // --- Send summary to admin via WhatsApp ---
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
  if (adminPhone) {
    const summary = `📊 *Daily Dharma Weekly Report*
${analysis.observations.map((o, i) => `${i + 1}. ${o}`).join('\n')}

💡 Feature Idea: ${analysis.featureIdea.name}
${analysis.featureIdea.description}

${analysis.alerts?.length > 0 ? `⚠️ Alerts:\n${analysis.alerts.join('\n')}` : '✅ No alerts'}

_Full report in dashboard_`;

    await sendWhatsAppMessage(adminPhone, summary);
  }

  logger.info({ message: 'Weekly insight report generated', reportId: report.id });
  return { reportId: report.id };
}

module.exports = { processInsightReport };
```

### 6.2 Autonomous Prompt Optimization

**Runs:** Every 2 weeks, Wednesday 3 AM IST
**Model:** `gemini-2.5-pro`
**File:** `server/src/jobs/promptOptimizationJob.js`

```javascript
const { getClient } = require('../config/gemini');
const prisma = require('../config/database');
const logger = require('../utils/logger');

const PRO_MODEL = 'gemini-2.5-pro';

async function processPromptOptimization(job) {
  // Get 5 lowest-performing prompt variants across all features
  const variants = await prisma.promptVariant.findMany({
    where: { isActive: true, lastReplyRate: { not: null } },
    orderBy: { lastReplyRate: 'asc' },
    take: 5,
  });

  if (variants.length === 0) {
    logger.info({ message: 'No variants with engagement data yet, skipping optimization' });
    return { action: 'skipped' };
  }

  const client = getClient();
  const model = client.getGenerativeModel({ model: PRO_MODEL });

  const results = [];

  for (const variant of variants) {
    const prompt = `You are a prompt engineering expert specializing in Hindu spiritual content for WhatsApp.

Here is an underperforming prompt variant:
- Feature: ${variant.featureKey}
- Style: ${variant.style}
- Current reply rate: ${Math.round((variant.lastReplyRate || 0) * 100)}%
- Current prompt text:
"""
${variant.promptText}
"""

The target audience is Hindu WhatsApp users in India (25-55 age group, Hindi/Hinglish speakers).

Rewrite this prompt to improve engagement. The rewritten version should:
1. Be more specific and less generic
2. Create more emotional connection
3. Include micro-hooks that invite replies (questions, reflections, relatable scenarios)
4. Maintain spiritual authenticity — not clickbaity
5. Keep the same style (${variant.style}) but make it more compelling

Return ONLY the rewritten prompt text. No explanations.`;

    const result = await model.generateContent(prompt);
    const rewrittenText = result.response.text().trim();

    // Save as new variant with verified: false
    const newVariant = await prisma.promptVariant.create({
      data: {
        featureKey: variant.featureKey,
        style: variant.style + '_optimized',
        promptText: rewrittenText,
        isActive: false, // requires admin approval
        verified: false,
        parentVariantId: variant.id,
        generatedBy: PRO_MODEL,
      }
    });

    results.push({
      originalId: variant.id,
      newVariantId: newVariant.id,
      style: variant.style,
      oldReplyRate: variant.lastReplyRate,
    });
  }

  logger.info({ message: 'Prompt optimization complete', optimized: results.length });
  return { optimized: results };
}

module.exports = { processPromptOptimization };
```

**Dashboard approval:** In the Next.js dashboard, add a page at `/dashboard/prompts` showing variants with `verified: false`. Admin clicks "Approve" to set `isActive: true, verified: true`. One-click deploy.

### 6.3 Content Gap Detection

**Runs:** Monthly, 1st of month at 4 AM IST
**Model:** `gemini-2.5-pro`
**File:** `server/src/jobs/contentGapJob.js`

```javascript
const { getClient } = require('../config/gemini');
const prisma = require('../config/database');
const logger = require('../utils/logger');

const PRO_MODEL = 'gemini-2.5-pro';

// All tags we expect to have content for
const EXPECTED_TAGS = [
  'gita', 'hanuman_chalisa', 'ramcharitmanas', 'vedas', 'upanishads',
  'mythology', 'temples', 'festivals', 'rituals', 'history',
  'science_in_hinduism', 'yoga', 'meditation', 'ayurveda',
  'vishnu', 'shiva', 'devi', 'ganesh', 'hanuman', 'krishna', 'rama',
];

async function processContentGapDetection(job) {
  // Count content per tag in ContentPool
  const tagCounts = {};
  for (const tag of EXPECTED_TAGS) {
    const count = await prisma.contentPool.count({
      where: { tags: { has: tag }, usedCount: { lt: 3 } } // content with low usage
    });
    tagCounts[tag] = count;
  }

  // Find gaps (tags with < 5 unused content pieces)
  const gaps = Object.entries(tagCounts)
    .filter(([_, count]) => count < 5)
    .map(([tag, count]) => ({ tag, currentCount: count, needed: 5 - count }));

  if (gaps.length === 0) {
    logger.info({ message: 'No content gaps detected' });
    return { gaps: 0 };
  }

  // Generate content to fill gaps
  const client = getClient();
  const model = client.getGenerativeModel({ model: PRO_MODEL });

  let totalGenerated = 0;

  for (const gap of gaps) {
    const prompt = `Generate ${gap.needed} pieces of Hindu spiritual content about "${gap.tag}" for a WhatsApp audience.

JSON format:
[{
  "content": "Content in Hindi/Hinglish (3-5 lines, conversational, warm)",
  "tags": ["${gap.tag}", "additional_relevant_tag"],
  "type": "fact",
  "source": "Scripture or reference"
}]

Requirements:
- Surprising, share-worthy, makes people forward the message
- Hindi/Hinglish, warm, non-preachy tone
- Accurate — do not fabricate scripture references
- Output ONLY valid JSON array`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const items = JSON.parse(text);

      for (const item of items) {
        await prisma.contentPool.create({
          data: {
            type: item.type || 'fact',
            content: item.content,
            tags: item.tags,
            source: item.source,
            generatedBy: PRO_MODEL,
          }
        });
        totalGenerated++;
      }
    } catch (err) {
      logger.error({ message: `Failed to generate content for tag: ${gap.tag}`, error: err.message });
    }
  }

  // Create dashboard notification
  await prisma.insightReport.create({
    data: {
      period: 'content-gap-' + new Date().toISOString().split('T')[0],
      rawData: { gaps, totalGenerated },
      observations: [`Found ${gaps.length} content gaps. Auto-generated ${totalGenerated} new pieces.`],
      promptChanges: [],
      featureIdea: {},
      alerts: gaps.filter(g => g.currentCount === 0).map(g => `CRITICAL: Zero content for tag "${g.tag}"`),
      model: PRO_MODEL,
    }
  });

  logger.info({ message: 'Content gap detection complete', gaps: gaps.length, generated: totalGenerated });
  return { gaps: gaps.length, generated: totalGenerated };
}

module.exports = { processContentGapDetection };
```

---

## 7. Phase 6 — Self-Healing (Month 2-3)

### 7.1 Error Pattern Detection

Track prompt failures and auto-repair.

**File:** `server/src/services/selfHealingService.js`

```javascript
const prisma = require('../config/database');
const { getClient } = require('../config/gemini');
const logger = require('../utils/logger');

const PRO_MODEL = 'gemini-2.5-pro';
const ERROR_THRESHOLD = 3; // 3 failures in 24 hours = auto-flag

// Called from aiService.js catch block
async function logPromptError(promptKey, errorMessage, promptText) {
  await prisma.$executeRaw`
    INSERT INTO "PromptErrorLog" ("promptKey", "errorMessage", "promptSnippet", "createdAt")
    VALUES (${promptKey}, ${errorMessage}, ${promptText.slice(0, 500)}, NOW())
  `;

  // Check if threshold exceeded
  const oneDayAgo = new Date(Date.now() - 86400000);
  const errorCount = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "PromptErrorLog"
    WHERE "promptKey" = ${promptKey} AND "createdAt" >= ${oneDayAgo}
  `;

  if (Number(errorCount[0]?.count) >= ERROR_THRESHOLD) {
    await repairPrompt(promptKey, promptText, errorMessage);
  }
}

async function repairPrompt(promptKey, originalPrompt, lastError) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: PRO_MODEL });

  const repairPrompt = `This prompt is consistently producing malformed output or API errors.

Original prompt:
"""
${originalPrompt}
"""

Last error: ${lastError}

Rewrite this prompt to:
1. Be more explicit about output format
2. Add guardrails against common failure modes (too long, wrong language, invalid JSON if JSON expected)
3. Maintain the same intent and content requirements
4. Be shorter if possible (reduce token count)

Return ONLY the rewritten prompt text.`;

  const result = await model.generateContent(repairPrompt);
  const repairedText = result.response.text().trim();

  // Save repair for admin review
  await prisma.promptVariant.create({
    data: {
      featureKey: promptKey,
      style: 'auto_repair',
      promptText: repairedText,
      isActive: false,
      verified: false,
      generatedBy: PRO_MODEL + '_repair',
    }
  });

  logger.warn({
    message: 'Auto-repair triggered for prompt',
    promptKey,
    errorCount: ERROR_THRESHOLD,
  });
}

module.exports = { logPromptError };
```

### 7.2 Scripture Exhaustion Alert

When a user is running low on unseen verses, proactively generate new scripture commentary.

**File:** `server/src/jobs/scriptureExhaustionJob.js`

```javascript
const prisma = require('../config/database');
const { getClient } = require('../config/gemini');
const logger = require('../utils/logger');

const PRO_MODEL = 'gemini-2.5-pro';
const LOW_THRESHOLD = 10;

async function processScriptureExhaustion(job) {
  const users = await prisma.user.findMany({
    where: { isOnboarded: true },
    select: { id: true, name: true }
  });

  const totalScriptures = await prisma.scripture.count();
  let alertCount = 0;

  for (const user of users) {
    const seenCount = await prisma.contentLog.count({
      where: { userId: user.id, contentType: 'verse' }
    });

    const remaining = totalScriptures - seenCount;

    if (remaining < LOW_THRESHOLD) {
      alertCount++;
      logger.warn({
        message: 'Scripture exhaustion warning',
        userId: user.id,
        remaining,
        total: totalScriptures,
      });
    }
  }

  // If any user is close to exhaustion, generate new scripture content
  if (alertCount > 0) {
    const client = getClient();
    const model = client.getGenerativeModel({ model: PRO_MODEL });

    const genPrompt = `Generate 10 Hindu scripture verses with commentary for a daily spiritual WhatsApp service.

JSON format:
[{
  "source": "Scripture name (e.g., Bhagavad Gita, Upanishads, Yoga Sutras, Ramcharitmanas)",
  "reference": "Chapter.Verse or section reference",
  "textSanskrit": "Original Sanskrit/Hindi verse",
  "textEnglish": "English translation",
  "textHindi": "Hindi translation",
  "transliteration": "IAST or simple transliteration",
  "tags": ["gita", "karma", "devotion"],
  "category": "One of: dharma, karma, bhakti, gyan, vairagya, seva"
}]

Requirements:
- Mix of well-known and lesser-known verses
- At least 2 from Gita, 2 from Upanishads, 2 from Ramcharitmanas, rest from other texts
- Accurate references — do NOT fabricate
- Output ONLY valid JSON array`;

    const result = await model.generateContent(genPrompt);
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const verses = JSON.parse(text);

    for (const v of verses) {
      await prisma.scripture.upsert({
        where: { source_reference: { source: v.source, reference: v.reference } },
        update: {},
        create: {
          source: v.source,
          reference: v.reference,
          textSanskrit: v.textSanskrit,
          textEnglish: v.textEnglish,
          textHindi: v.textHindi,
          transliteration: v.transliteration,
          tags: v.tags,
          category: v.category,
        }
      });
    }

    logger.info({ message: 'Scripture exhaustion: generated new verses', count: verses.length, alertedUsers: alertCount });
  }

  return { alertedUsers: alertCount, totalScriptures };
}

module.exports = { processScriptureExhaustion };
```

### 7.3 Streak Recovery AI

When a user breaks a streak of 7+ days, generate a personalized "welcome back" message using their history.

**Modify:** `server/src/jobs/streakCheckJob.js`

```javascript
// Add to existing streakCheckJob.js

async function generateStreakRecoveryMessage(user) {
  // Get user's recent engagement history
  const recentLogs = await prisma.contentLog.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: 10,
    select: { contentType: true, contentTag: true, gotReply: true }
  });

  const repliedTags = recentLogs
    .filter(l => l.gotReply && l.contentTag)
    .map(l => l.contentTag);

  const prompt = `You are Shri Krishna speaking to ${user.name || 'a devotee'} who just broke a ${user.streakCount}-day streak on Daily Dharma (a Hindu spiritual WhatsApp companion).

They haven't opened the app in a few days. Their favorite topics were: ${repliedTags.join(', ') || 'various spiritual topics'}.

Write a warm, personal "welcome back" message in Hindi/Hinglish (3-4 lines) that:
- Does NOT guilt-trip or shame them
- Acknowledges that life gets busy
- References their past streak with pride ("${user.streakCount} din ka streak tha — woh tumhari takat ka saboot hai")
- Gently invites them back with warmth
- Feels like a loving parent welcoming a child home

Sign off as — Shri Krishna
Keep under 60 words. Hindi only.`;

  const { generateText } = require('./aiService');
  return generateText(prompt);
}

// In the streak break detection logic:
// if (previousStreak >= 7 && newStreak === 0) {
//   const recoveryMsg = await generateStreakRecoveryMessage(user);
//   await sendWhatsAppMessage(user.phone, recoveryMsg);
// }
```

---

## 8. Full Schema (Prisma Additions)

Add these models to `server/prisma/schema.prisma`:

```prisma
// ============================================================
// AI SELF-IMPROVEMENT SCHEMA ADDITIONS
// ============================================================

// --- Content tracking ---
model ContentLog {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  contentType String    // verse, trivia, fact, raashifal, bhagwan_sandesh, bonus
  contentId   String?   // FK to specific content table (nullable for generated content)
  contentTag  String?   // theme tag for preference tracking
  date        DateTime  @db.Date
  gotReply    Boolean   @default(false)
  replyAt     DateTime?
  createdAt   DateTime  @default(now())

  @@index([userId, contentType, date])
  @@index([contentType, gotReply])
}

// --- AI-generated content pool ---
model ContentPool {
  id          String   @id @default(uuid())
  type        String   // fact, hanuman_chaupai, trivia_generated, verse_commentary
  content     String   // main content text or JSON blob
  tags        String[]
  source      String?  // scripture reference or "AI generated"
  generatedBy String?  // model name that generated this
  qualityScore Float   @default(0) // updated by engagement data
  usedCount   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([type, isActive])
  @@index([tags])
}

// --- Prompt A/B testing ---
model PromptVariant {
  id              String    @id @default(uuid())
  featureKey      String    // bhagwan_sandesh, raashifal, daily_message
  style           String    // father, friend, guru, etc.
  promptText      String    // full prompt template
  isActive        Boolean   @default(true)
  verified        Boolean   @default(true) // false = needs admin approval
  lastReplyRate   Float?
  lastEvaluatedAt DateTime?
  parentVariantId String?   // if this was auto-optimized from another variant
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

// --- Hindu calendar ---
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

// --- 12-week narrative cycle ---
model WeeklyTheme {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  weekNumber     Int      // absolute week number (1, 2, 3, ... 13 = cycle 2 week 1)
  cycleWeek      Int      // 1-12 within the current cycle
  cycle          Int      // which 12-week cycle (1, 2, 3...)
  themeSanskrit  String
  themeEnglish   String
  teaching       String
  startsAt       DateTime
  createdAt      DateTime @default(now())

  @@index([userId, weekNumber])
}

// --- AI insight reports ---
model InsightReport {
  id            String   @id @default(uuid())
  period        String   // "2026-03-21 to 2026-03-28"
  rawData       Json     // engagement data snapshot
  observations  Json     // string[]
  promptChanges Json     // { target, currentIssue, suggestedChange, expectedImpact }[]
  featureIdea   Json     // { name, description, rationale, effort }
  alerts        Json     // string[]
  model         String   // which model generated this
  createdAt     DateTime @default(now())
}

// --- Error tracking for self-healing ---
model PromptErrorLog {
  id            String   @id @default(uuid())
  promptKey     String
  errorMessage  String
  promptSnippet String?
  createdAt     DateTime @default(now())

  @@index([promptKey, createdAt])
}
```

**User model additions** (add these fields to the existing User model):

```prisma
model User {
  // ... existing fields ...

  // AI Self-Improvement additions
  engagementProfile Json?     // { replyRate, avgReplyMinutes, peakHour, tier, ... }
  contentCycleWeek  Int       @default(0) // absolute week counter for narrative cycle
  lastThemeTag      String?   // current week's theme in lowercase

  // New relations
  contentLogs       ContentLog[]
  weeklyThemes      WeeklyTheme[]
  promptVariants    UserPromptVariant[]
}
```

---

## 9. Complete Job Schedule

### All BullMQ Jobs (Existing + New)

| Job Name | Queue | Cron / Interval | Timezone | Model Used | Est. Cost/Run | Description |
|----------|-------|-----------------|----------|------------|---------------|-------------|
| **EXISTING** | | | | | | |
| `dailyScan` | dailyMessageQueue | Every 5 min | — | — | $0 | Scans for users needing daily message |
| `sendDailyMessage` | dailyMessageQueue | Per-user (triggered) | — | Flash | ~$0.001 | Generates & sends daily message |
| `streakCheck` | streakCheckQueue | `0 0 * * *` | Asia/Kolkata | — | $0 | Midnight streak reset |
| `bonusScan` (trivia Q) | bonusMessageQueue | `0 12 * * 1` | Asia/Kolkata | — | $0 | Monday 12 PM trivia scan |
| `bonusScan` (trivia A) | bonusMessageQueue | `0 18 * * 1` | Asia/Kolkata | — | $0 | Monday 6 PM answer reveal |
| `bonusScan` (morning) | bonusMessageQueue | `0 8 * * 0,2-6` | Asia/Kolkata | Flash | ~$0.001 | Tue-Sun morning bonus |
| **NEW — Phase 1** | | | | | | |
| `contentGeneration` | intelligenceQueue | `0 23 * * 0` | Asia/Kolkata | **Pro** | ~$0.15 | Sunday 11 PM: generate trivia + facts + chaupais |
| `engagementProfileUpdate` | intelligenceQueue | `0 3 * * *` | Asia/Kolkata | — | $0 | Daily 3 AM: recalculate all user profiles |
| **NEW — Phase 3** | | | | | | |
| `calendarSeed` | intelligenceQueue | `0 22 * * 0` | Asia/Kolkata | — | $0 | Sunday 10 PM: seed next week's calendar events |
| **NEW — Phase 4** | | | | | | |
| `weeklyTheme` | intelligenceQueue | `30 23 * * 0` | Asia/Kolkata | — | $0 | Sunday 11:30 PM: assign next week's theme |
| **NEW — Phase 5** | | | | | | |
| `insightReport` | intelligenceQueue | `0 6 * * 1` | Asia/Kolkata | **Pro** | ~$0.05 | Monday 6 AM: weekly analytics report |
| `variantRotation` | intelligenceQueue | `0 5 * * 1` | Asia/Kolkata | — | $0 | Monday 5 AM: shift users between variants |
| `promptOptimization` | intelligenceQueue | `0 3 * * 3` (biweekly) | Asia/Kolkata | **Pro** | ~$0.25 | Every 2 weeks Wed 3 AM: rewrite underperformers |
| `contentGapDetection` | intelligenceQueue | `0 4 1 * *` | Asia/Kolkata | **Pro** | ~$0.20 | 1st of month 4 AM: find and fill content gaps |
| **NEW — Phase 6** | | | | | | |
| `scriptureExhaustion` | intelligenceQueue | `0 2 * * 1` | Asia/Kolkata | **Pro** (conditional) | $0-0.10 | Monday 2 AM: check verse availability |

### New Queue Registration

Add to `server/src/config/queues.js`:

```javascript
// Add to existing JOB_NAMES
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
};
```

---

## 10. Model Usage Guide

### Decision Matrix

| Situation | Model | Why |
|-----------|-------|-----|
| Daily message generation (raashifal, shloka, sandesh) | `gemini-2.5-flash` | Low latency, low cost. Runs per-user. |
| Chat / conversational replies | `gemini-2.5-flash` | Real-time, user-facing. Speed matters. |
| Bonus content (name meaning, dream interpretation) | `gemini-2.5-flash` | User-facing, needs to be fast. |
| Weekly content generation (trivia, facts, chaupais) | `gemini-2.5-pro` | Quality > speed. Runs once/week. |
| Weekly insight report analysis | `gemini-2.5-pro` | Complex reasoning over data. |
| Prompt rewriting / optimization | `gemini-2.5-pro` | Needs to understand prompt engineering deeply. |
| Content gap filling | `gemini-2.5-pro` | Needs to generate accurate, diverse content. |
| Scripture generation (exhaustion recovery) | `gemini-2.5-pro` | Accuracy critical — Sanskrit verses must be real. |
| Self-healing prompt repair | `gemini-2.5-pro` | Needs to diagnose failure modes. |
| Streak recovery messages | `gemini-2.5-flash` | Per-user, needs to be fast. Simple generation. |

### When to Consider Claude Opus

Switch to `claude-opus-4-6` if Gemini Pro:
- Generates inaccurate scripture references more than 10% of the time
- Produces shallow insight reports that don't surface non-obvious patterns
- Fails at multi-step reasoning in prompt optimization (e.g., can't reason about why a prompt causes certain failure modes)

To test: run one insight report through both models, compare quality manually. If Opus is significantly better, use it for the `insightReport` and `promptOptimization` jobs only.

**Claude Opus integration** (add to `server/src/config/claude.js` if needed):

```javascript
const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClaudeClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return client;
}

async function generateWithClaude(prompt, systemPrompt) {
  const client = getClaudeClient();
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt || '',
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].text;
}

module.exports = { generateWithClaude };
```

---

## 11. Implementation Checklist

### Week 1: Content Tracking + History-Aware Selection

- [ ] Add `ContentLog`, `ContentPool` models to `server/prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name add_content_intelligence`
- [ ] Create `server/src/services/contentLogService.js`
- [ ] Modify `server/src/services/scriptureService.js` — add `getVerseForUser(userId)` with 60-day dedup
- [ ] Modify `server/src/services/dailyMessageService.js` — call `contentLogService.logContent()` after every message sent
- [ ] Modify `server/src/routes/webhook.js` — call `contentLogService.markReply()` when user replies
- [ ] **Done criteria:** Every sent message creates a ContentLog row. Replies update `gotReply`. Verse selection never repeats within 60 days.

### Week 2: Raashifal Lenses + Scenario Seeds + Content Generation

- [ ] Create `server/src/services/raashifalLensService.js`
- [ ] Create `server/src/data/scenarioSeeds.json` (50 seeds)
- [ ] Modify `server/src/prompts/daily_v2.txt` — add `{raashifalLens}`, `{raashifalLensInstruction}`, `{scenarioSeed}` placeholders
- [ ] Modify `server/src/services/dailyMessageService.js` — inject lens and scenario into prompt
- [ ] Create `server/src/jobs/contentGenerationJob.js`
- [ ] Register `contentGeneration` job in `server/src/jobs/index.js` (Sunday 11 PM IST)
- [ ] Create `server/src/services/contentScoringService.js` — weighted selection based on reply rates
- [ ] **Done criteria:** Raashifal has a different "feel" each day. Content pool grows by ~12 items/week automatically. Content with higher reply rates gets picked more.

### Week 3: Personalization + Hindu Calendar

- [ ] Add `engagementProfile`, `contentCycleWeek`, `lastThemeTag` fields to User model
- [ ] Add `PromptVariant`, `UserPromptVariant`, `HinduCalendarEvent` models to schema
- [ ] Run `npx prisma migrate dev --name add_personalization_calendar`
- [ ] Create `server/src/services/engagementService.js`
- [ ] Create `server/src/services/toneForkService.js`
- [ ] Create `server/src/services/promptVariantService.js`
- [ ] Create `server/src/jobs/engagementProfileJob.js` (daily 3 AM)
- [ ] Seed 3 initial PromptVariant rows (father/friend/guru) via seed script
- [ ] Create `server/src/jobs/calendarSeedJob.js`
- [ ] Register calendar and engagement jobs in `server/src/jobs/index.js`
- [ ] Modify `server/src/services/dailyMessageService.js` — inject tone fork + calendar context + variant prompt
- [ ] **Done criteria:** Users auto-assigned to A/B variants. Daily message tone varies by engagement tier. Calendar events appear in prompts.

### Week 4: Narrative Cycle + Variant Rotation

- [ ] Add `WeeklyTheme` model to schema
- [ ] Run `npx prisma migrate dev --name add_weekly_theme`
- [ ] Create `server/src/jobs/weeklyThemeJob.js`
- [ ] Create `server/src/jobs/variantRotationJob.js`
- [ ] Create `server/src/services/userContentMemoryService.js`
- [ ] Register weeklyTheme (Sunday 11:30 PM) and variantRotation (Monday 5 AM) jobs
- [ ] Modify `server/src/prompts/daily_v2.txt` — add theme + arc beat placeholders
- [ ] **Done criteria:** Every user has a weekly theme assigned. Messages reflect the 4-beat narrative arc. Variant rotation auto-shifts users from worst to best performer weekly.

### Month 2 (Week 5-6): Product Intelligence

- [ ] Add `InsightReport`, `PromptErrorLog` models to schema
- [ ] Run `npx prisma migrate dev --name add_intelligence`
- [ ] Create `server/src/jobs/insightReportJob.js`
- [ ] Create `server/src/jobs/promptOptimizationJob.js`
- [ ] Create `server/src/jobs/contentGapJob.js`
- [ ] Register all intelligence jobs in `server/src/jobs/index.js`
- [ ] Add `ADMIN_WHATSAPP_NUMBER` to `.env`
- [ ] Build `/dashboard/prompts` page — list unverified variants with approve/reject buttons
- [ ] Build `/dashboard/insights` page — show InsightReport history with charts
- [ ] **Done criteria:** Monday morning you get a WhatsApp message with the weekly report. Prompt optimization generates improved variants for your review. Content gaps are auto-filled.

### Month 2-3 (Week 7-8): Self-Healing

- [ ] Create `server/src/services/selfHealingService.js`
- [ ] Modify `server/src/services/aiService.js` — add error logging hook
- [ ] Create `server/src/jobs/scriptureExhaustionJob.js`
- [ ] Modify `server/src/jobs/streakCheckJob.js` — add streak recovery message generation
- [ ] Register scriptureExhaustion job in `server/src/jobs/index.js`
- [ ] **Done criteria:** Malformed-output prompts get auto-flagged after 3 failures. Users never run out of verses. Broken streaks of 7+ days get a personalized welcome-back message.

---

## 12. Estimated Costs

### Gemini API Costs (Monthly)

**Assumptions:**
- Daily message = ~500 input tokens + ~300 output tokens (Flash)
- Bonus message = ~300 input tokens + ~200 output tokens (Flash)
- Weekly content gen = ~2000 input + ~3000 output tokens (Pro) x 3 calls
- Insight report = ~3000 input + ~1500 output tokens (Pro) x 1 call
- Prompt optimization = ~1000 input + ~500 output tokens (Pro) x 5 calls biweekly

**Gemini 2.5 Flash pricing** (as of March 2026): ~$0.075/1M input, ~$0.30/1M output
**Gemini 2.5 Pro pricing**: ~$1.25/1M input, ~$5.00/1M output

| Component | 100 Users | 1,000 Users | 10,000 Users |
|-----------|-----------|-------------|--------------|
| Daily messages (Flash) | $0.80/mo | $8.00/mo | $80.00/mo |
| Bonus messages (Flash) | $0.30/mo | $3.00/mo | $30.00/mo |
| Chat replies (Flash, est. 20% reply) | $0.15/mo | $1.50/mo | $15.00/mo |
| **Subtotal: User-facing (Flash)** | **$1.25/mo** | **$12.50/mo** | **$125.00/mo** |
| Weekly content gen (Pro, 4x/mo) | $0.60/mo | $0.60/mo | $0.60/mo |
| Insight reports (Pro, 4x/mo) | $0.20/mo | $0.20/mo | $0.20/mo |
| Prompt optimization (Pro, 2x/mo) | $0.25/mo | $0.25/mo | $0.25/mo |
| Content gap detection (Pro, 1x/mo) | $0.20/mo | $0.20/mo | $0.20/mo |
| Scripture exhaustion (Pro, conditional) | $0.00/mo | $0.10/mo | $0.10/mo |
| Self-healing repairs (Pro, rare) | $0.05/mo | $0.05/mo | $0.05/mo |
| Streak recovery messages (Flash) | $0.02/mo | $0.20/mo | $2.00/mo |
| **Subtotal: Self-improvement (Pro)** | **$1.32/mo** | **$1.60/mo** | **$3.40/mo** |
| **TOTAL** | **$2.57/mo** | **$14.10/mo** | **$128.40/mo** |

### Key Insight on Costs

The self-improvement layer (Pro model) is essentially a **fixed cost** — it doesn't scale with users. Whether you have 100 or 10,000 users, the intelligence jobs cost roughly the same (~$1.50-3.50/month). The variable cost is all in the Flash tier (user-facing generation).

At 10,000 users with Premium at 5% conversion (500 paying users x Rs.99), monthly revenue = ~Rs.49,500 (~$590). Gemini cost = ~$128. That's a **22% cost-of-revenue** which is healthy for an AI-first product.

### If Using Claude Opus Instead of Pro

Replace Pro costs with Opus pricing (~$15/1M input, ~$75/1M output):

| Component | Cost (Opus) |
|-----------|-------------|
| Weekly content gen (4x/mo) | ~$3.00/mo |
| Insight reports (4x/mo) | ~$1.50/mo |
| Prompt optimization (2x/mo) | ~$2.00/mo |
| Content gap detection (1x/mo) | ~$1.50/mo |
| **Total intelligence layer with Opus** | **~$8.00/mo** |

Still very affordable since these jobs run so infrequently. Use Opus only if the quality gap over Pro justifies the 5-8x cost increase.

---

## Appendix: Sunday Night Job Sequence

All weekly prep jobs run Sunday night in this order:

```
10:00 PM IST — calendarSeed        (seed next week's Hindu calendar events)
10:30 PM IST — (buffer)
11:00 PM IST — contentGeneration   (Gemini Pro generates new trivia/facts/chaupais)
11:30 PM IST — weeklyTheme         (assign next week's narrative theme to all users)
11:45 PM IST — (buffer)
12:00 AM IST — streakCheck          (existing: midnight streak reset)

Monday:
 2:00 AM IST — scriptureExhaustion  (check verse availability)
 3:00 AM IST — engagementProfile    (recalculate all user engagement profiles)
 5:00 AM IST — variantRotation      (shift users from worst to best variant)
 5:30 AM IST — dailyScan starts     (users start getting their Monday messages)
 6:00 AM IST — insightReport        (Gemini Pro analyzes last week, sends WhatsApp summary)
```

This sequence ensures that by the time Monday's daily messages start generating at 5:30-6:00 AM, all intelligence has been updated: fresh content in the pool, themes assigned, calendar loaded, engagement profiles current, and variants rotated.

---

## 13. What You See in the Dashboard

> **For the founder opening the dashboard every morning.** This section maps every automated process to exactly what surfaces in the Next.js dashboard (`dashboard/src/app/`), so you always know: Is the system healthy? What did the AI do while I slept?

### 13.1 Morning Dashboard Overview (`/dashboard`)

When you open `/dashboard`, you see the existing Streak card and Today's Message card, plus these new widgets added below the existing cards grid:

#### System Health Badge (top-right of greeting area)
- **What it shows:** A single status pill — green "All Systems Go", yellow "1 Alert", or red "Action Required"
- **Data source:** Aggregates from BullMQ job run history. Green = all jobs completed in the last 24h. Yellow = 1 job failed or is overdue. Red = 2+ failures or a critical alert.
- **API:** `GET /api/admin/health/summary` returns `{ status: "healthy"|"warning"|"critical", failedJobs: number, pendingAlerts: number }`

#### Weekly Theme Card
- **What it shows:** Current week's Sanskrit theme name, English name, and teaching line. Shows which narrative beat today falls on (Introduce / Explore / Challenge / Resolve). Shows cycle number (e.g., "Cycle 2, Week 5").
- **Trigger:** `weeklyTheme` job runs Sunday 11:30 PM IST, writes to `WeeklyTheme` table
- **API:** `GET /api/admin/theme/current` returns `{ themeSanskrit, themeEnglish, teaching, arcBeat, cycleWeek, cycle }`

#### A/B Variant Winner Card
- **What it shows:** The 3 Bhagwan Sandesh variants (father / friend / guru) with their current reply rates as a bar chart. The winning variant is highlighted in gold. Shows user distribution count per variant and how many users were moved in the last rotation.
- **Trigger:** `variantRotation` job runs Monday 5 AM IST, updates `PromptVariant.lastReplyRate`
- **API:** `GET /api/admin/variants/performance` returns `[{ style, replyRate, userCount, isWinner }]`

#### Content Pool Levels Card
- **What it shows:** Three mini-gauges: Trivia Pool (e.g., "23 unused"), Facts Pool (e.g., "15 unused"), Chaupai Pool (e.g., "8 unused"). Each gauge turns yellow below 10 and red below 5. Shows "Last generated: 2 days ago" below.
- **Trigger:** `contentGeneration` job runs Sunday 11 PM IST, adds to `ContentPool` table
- **API:** `GET /api/admin/content/pool-levels` returns `{ trivia: { unused, total, lastGenerated }, facts: {...}, chaupais: {...} }`

#### Quick Alerts Strip
- **What it shows:** Horizontal strip of alert pills. Examples: "3 prompts awaiting approval", "Scripture pool low for 2 users", "Engagement drop >20% this week". Each pill links to the relevant page.
- **Data source:** Aggregated from `InsightReport.alerts`, unverified `PromptVariant` count, `PromptErrorLog` threshold checks
- **API:** `GET /api/admin/alerts/active` returns `[{ type, message, severity, linkTo }]`

### 13.2 Intelligence Page (`/intelligence`) — NEW PAGE

This is the AI brain of the product. You open this to understand what the AI learned and what it recommends.

#### Weekly Insight Report Panel (main content area)
- **What it shows:** The latest `InsightReport` rendered as a card with:
  - **Observations** — numbered list of data-backed insights (e.g., "Mesh rashi reply rate dropped 15% vs last week — consider adjusting Shani reference frequency")
  - **Prompt Change Suggestions** — table: Target, Current Issue, Suggested Change, Expected Impact
  - **Feature Idea** — card with name, description, rationale, effort estimate
  - **Alerts** — red-bordered box with any concerning trends
- **Trigger:** `insightReport` job runs Monday 6 AM IST, writes to `InsightReport` table
- **API:** `GET /api/admin/intelligence/reports?limit=10` returns paginated reports
- **API:** `GET /api/admin/intelligence/reports/:id` returns single report detail

#### Trend Charts (below the report)
- **Reply Rate Over Time** — line chart, last 8 weeks, broken down by content type (raashifal, sandesh, trivia, bonus). One line per type.
- **Streak Retention Funnel** — bar chart showing user distribution across streak buckets (0, 1-3, 4-7, 8-21, 22-40, 40+). Compared to previous week.
- **Viral Share Rate** — line chart showing referral code usage over time
- **API:** `GET /api/admin/intelligence/trends?weeks=8` returns `{ replyRates: [...], streakDistribution: [...], viralRate: [...] }`

#### Prompt Rewrite Approval Queue
- **What it shows:** Cards for each `PromptVariant` where `verified = false`. Each card shows: original prompt text (collapsed), AI-rewritten text, the model that generated it, the parent variant's reply rate. Two buttons: "Approve" (sets `isActive: true, verified: true`) and "Reject" (deletes the variant).
- **Trigger:** `promptOptimization` job runs biweekly Wednesday 3 AM IST, creates variants with `verified: false`
- **API:** `GET /api/admin/variants/pending` returns unverified variants
- **API:** `POST /api/admin/variants/:id/approve` — sets verified + active
- **API:** `POST /api/admin/variants/:id/reject` — soft-deletes

#### Report History (sidebar or tabs)
- **What it shows:** List of all past `InsightReport` entries, date + summary line. Click to expand full report.
- **API:** Same as reports endpoint with pagination

### 13.3 Content Management Page (`/content`) — NEW PAGE

Where you manage the AI-generated content pool and review what goes out to users.

#### Content Pool Browser (main table)
- **What it shows:** Filterable, sortable table of all `ContentPool` entries. Columns: Type (fact/trivia/chaupai), Content preview (first 80 chars), Tags, Quality Score, Times Used, Generated By (model name), Status (active/inactive/pending), Created Date.
- **Filters:** By type, by tag, by status (active / pending review / rejected)
- **Sort:** By quality score (desc), by created date, by times used
- **API:** `GET /api/admin/content/pool?type=fact&status=active&page=1&limit=20`

#### Approve / Reject Buttons
- **What it shows:** Content items generated by AI with `isActive: false` (pending review) show Approve / Reject action buttons.
- **Flow:** Approve sets `isActive: true`. Reject sets `isActive: false` and adds a `rejectedAt` timestamp.
- **API:** `POST /api/admin/content/:id/approve` — activates content
- **API:** `POST /api/admin/content/:id/reject` — deactivates content

#### Manual Content Entry Form
- **What it shows:** Form with fields: Type (dropdown), Content (textarea), Tags (multi-select), Source (text input). Submit adds to `ContentPool` with `generatedBy: "manual"`.
- **API:** `POST /api/admin/content/create`

#### Content Performance Table
- **What it shows:** Top 20 content items ranked by reply rate. Columns: Content preview, Type, Times Sent, Reply Rate, Avg Reply Speed. Helps you see what resonates.
- **API:** `GET /api/admin/content/performance?limit=20`

### 13.4 System Health Page (`/health`) — NEW PAGE

The ops dashboard. Check this when something feels off.

#### Job Run History Table (main content)
- **What it shows:** Table of all BullMQ job executions from the last 7 days. Columns: Job Name, Queue, Started At, Duration, Status (completed/failed/stalled), Result summary. Failed jobs are highlighted in red with error message expandable.
- **Data source:** BullMQ job completion/failure events, stored in a `JobRunLog` table or queried directly from Redis
- **API:** `GET /api/admin/health/jobs?days=7` returns `[{ jobName, queue, startedAt, duration, status, result, error }]`

#### Error Log Panel
- **What it shows:** All `PromptErrorLog` entries from the last 7 days. Columns: Prompt Key, Error Message, Prompt Snippet (first 100 chars), Timestamp. Shows count per prompt key as a summary row at top.
- **API:** `GET /api/admin/health/errors?days=7`

#### Content Pool Exhaustion Monitor
- **What it shows:** Per-content-type: total items, unused items, estimated days until exhaustion (based on current send rate). Red warning when < 7 days of content remain.
- **Trigger:** Recalculated on page load from `ContentPool` table stats
- **API:** `GET /api/admin/health/content-exhaustion`

#### Scripture Coverage Per User
- **What it shows:** Distribution chart: how many users have seen >80% of all scriptures, 50-80%, <50%. Highlights users approaching exhaustion (<10 unseen verses).
- **Trigger:** `scriptureExhaustion` job runs Monday 2 AM IST
- **API:** `GET /api/admin/health/scripture-coverage`

#### Active Alerts Panel
- **What it shows:** All actionable alerts in one place. Types:
  - **Prompt Error Threshold** — "Daily message prompt has failed 3x in 24h — auto-repair generated, awaiting approval"
  - **Content Exhaustion** — "Trivia pool at 4 items — content generation job triggered"
  - **Engagement Drop** — "Overall reply rate dropped 25% vs last week"
  - **Job Failure** — "insightReport job failed at 6:02 AM — error: Gemini API timeout"
  Each alert has a severity badge (info/warning/critical) and an action link.
- **API:** `GET /api/admin/alerts/active` (shared with dashboard quick alerts)

### 13.5 Updated Existing Pages

#### `/history` — Message History
**New additions:**
- **Content Type Tag** on each message card — a colored pill showing the type: "Raashifal" (orange), "Shloka" (saffron), "Sandesh" (blue), "Trivia" (green), "Bonus" (purple)
- **Engagement Indicator** — small icon on each message: checkmark if user replied, clock icon with reply speed, or dash if no reply
- **Content Tag** — shows the `contentTag` from `ContentLog` (e.g., "gita", "practical", "temples")
- **API:** Extend existing `GET /api/messages` to include `contentType`, `contentTag`, `gotReply`, `replySpeed` fields from `ContentLog` join

#### `/dashboard` — Main Dashboard
**New additions** (described in 13.1 above):
- System Health Badge in greeting area
- Weekly Theme Card in cards grid
- A/B Variant Winner Card in cards grid
- Content Pool Levels Card in cards grid
- Quick Alerts Strip below cards grid
- New nav links: "Intelligence", "Content", "Health" added to nav bar

### 13.6 Complete Process-to-Dashboard Mapping

| Process | Trigger | What It Does | Dashboard Location | What You See |
|---------|---------|-------------|-------------------|-------------|
| **Content Generation** | Sunday 11 PM IST | Gemini Pro generates 5 trivia + 3 facts + 4 chaupais | `/dashboard` Content Pool Levels card; `/content` pool browser | Pool counts increase; new items appear with "pending" status if approval required |
| **A/B Variant Rotation** | Monday 5 AM IST | Compares variant reply rates, moves 20% of worst users to best | `/dashboard` A/B Winner card; `/intelligence` trend charts | Bar chart updates with new rates; moved-users count shown |
| **Insight Report** | Monday 6 AM IST | Gemini Pro analyzes 7 days of data, generates observations + recommendations | `/intelligence` main panel; admin WhatsApp | Full report card with observations, prompt suggestions, feature ideas |
| **Calendar Sync** | Sunday 10 PM IST | Seeds next 7 days of Hindu calendar events | `/dashboard` (if calendar widget added in Sprint 3) | This week's festivals, ekadashi, day-deities listed |
| **Weekly Theme Assignment** | Sunday 11:30 PM IST | Assigns next week's narrative theme to all users | `/dashboard` Weekly Theme card | Theme name, teaching, today's arc beat |
| **Engagement Profile Update** | Daily 3 AM IST | Recalculates reply rates, tiers, peak hours for all users | `/intelligence` trend charts; `/health` | Trend lines update; engagement distribution refreshes |
| **Prompt Optimization** | Biweekly Wed 3 AM IST | Gemini Pro rewrites underperforming prompts | `/intelligence` approval queue | "3 prompts awaiting approval" alert; rewrite cards appear |
| **Content Gap Detection** | 1st of month 4 AM IST | Finds tags with <5 unused items, auto-generates to fill | `/content` pool browser; `/health` exhaustion monitor | New content appears; gap counts reduce |
| **Scripture Exhaustion Check** | Monday 2 AM IST | Checks per-user verse availability, generates if low | `/health` scripture coverage chart | Coverage distribution updates; exhaustion warnings if triggered |
| **Self-Healing (Error Detection)** | Continuous (on error) | Logs prompt failures, auto-repairs after 3 failures in 24h | `/health` error log; `/intelligence` approval queue | Error entries appear; auto-repair variant shows in approval queue |
| **Streak Recovery** | Continuous (on streak break) | Sends personalized welcome-back message to 7+ day streak breakers | `/history` (message appears in user's history) | Recovery message logged with "streak_recovery" content type tag |

### 13.7 Morning Routine — What to Check

Every morning, the founder's workflow should be:

1. **Open `/dashboard`** — glance at the health badge. Green = done. Yellow/red = go to `/health`.
2. **Check the Weekly Theme card** — know what spiritual theme is guiding this week's content.
3. **Check the A/B Winner card** — see which Bhagwan Sandesh voice is winning. If one is significantly ahead, the system already moved users automatically.
4. **Check the Content Pool Levels** — are pools topped up? Content generation should have run Sunday night.
5. **Check the Alerts Strip** — any prompts to approve? Any errors to investigate?
6. **On Mondays: Open `/intelligence`** — read the weekly insight report. Review AI recommendations. Approve or reject any rewritten prompts.
7. **Weekly: Open `/content`** — review any AI-generated content flagged for approval. Check performance rankings to understand what content resonates.
8. **If something is wrong: Open `/health`** — see which jobs failed, check error logs, verify content exhaustion levels.
