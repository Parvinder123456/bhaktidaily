'use strict';

const { getClient } = require('../config/gemini');
const db = require('../config/db');
const logger = require('../utils/logger');

const PRO_MODEL = 'gemini-2.5-pro';

// ---------------------------------------------------------------------------
// Prompts for content generation
// ---------------------------------------------------------------------------

const TRIVIA_PROMPT = `Generate 5 Hindu mythology and spirituality trivia questions.
Each question must be factually accurate and suitable for daily devotional practice.

Return ONLY a valid JSON array in this exact format (no markdown, no extra text):
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answerIndex": 0,
    "explanation": "...",
    "tags": ["mythology", "temples"]
  }
]

Topics to cover: sacred rivers, temple history, deity stories, scriptures (Ramayana, Mahabharata, Puranas), festivals.
Keep questions engaging, not too easy, not too obscure. Explanation should be 1-2 lines.`;

const FACTS_PROMPT = `Generate 3 "Kya Aap Jaante Hain" (Did You Know) Hindu spiritual facts.
Each fact should be surprising, culturally enriching, and factually verified.

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "content": "Kya aap jaante hain ki... [fact in Hinglish, 2-3 sentences]",
    "source": "scripture reference or historical source",
    "tags": ["ritual", "history"]
  }
]

Topics: temple architecture, ritual significance, Sanskrit etymology, historical facts about festivals, sacred geometry.`;

const CHAUPAI_PROMPT = `Generate 4 Hanuman Chalisa chaupai commentary entries.
Each entry should provide the original chaupai (in Devanagari or transliteration) with a modern, relatable explanation.

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "content": {
      "chaupai": "original verse text",
      "transliteration": "roman script transliteration",
      "meaning": "word by word meaning",
      "commentary": "2-3 lines connecting this chaupai to daily modern life situations in Hinglish"
    },
    "source": "Hanuman Chalisa, chaupai number",
    "tags": ["hanuman_chalisa", "devotion"]
  }
]`;

// ---------------------------------------------------------------------------
// Helper: call Gemini Pro with retry
// ---------------------------------------------------------------------------

async function callGeminiPro(prompt, maxRetries = 3) {
  let lastError;
  let delay = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = getClient();
      const model = client.getGenerativeModel({ model: PRO_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text;
    } catch (err) {
      lastError = err;
      logger.warn({
        message: `Gemini Pro call failed (attempt ${attempt}/${maxRetries})`,
        error: err.message,
        delay,
      });
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // exponential backoff
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Helper: safely parse JSON from Gemini output
// ---------------------------------------------------------------------------

function safeParseJson(text, label) {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error({ message: `Failed to parse ${label} JSON from Gemini`, error: err.message, rawText: text.slice(0, 200) });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generator functions
// ---------------------------------------------------------------------------

/**
 * Get topics already in the pool to avoid duplicates.
 * @param {string} type
 * @returns {Promise<string[]>}
 */
async function getRecentTopics(type) {
  const recent = await db.contentPool.findMany({
    where: { type, isActive: true },
    select: { content: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return recent.map(r => r.content.slice(0, 80)); // first 80 chars as fingerprint
}

/**
 * Generate and insert trivia questions.
 * @returns {Promise<number>} Count of items added
 */
async function generateTrivia() {
  const recentTopics = await getRecentTopics('trivia_generated');
  const avoidHint = recentTopics.length > 0
    ? `\nAvoid topics similar to these recent questions: ${recentTopics.slice(0, 5).join(' | ')}`
    : '';

  const raw = await callGeminiPro(TRIVIA_PROMPT + avoidHint);
  const items = safeParseJson(raw, 'trivia');
  if (!items || !Array.isArray(items)) return 0;

  let added = 0;
  for (const item of items) {
    try {
      await db.contentPool.create({
        data: {
          type: 'trivia_generated',
          content: JSON.stringify({
            question: item.question,
            options: item.options,
            answerIndex: item.answerIndex,
            explanation: item.explanation,
          }),
          tags: item.tags || ['trivia'],
          source: 'AI generated',
          generatedBy: PRO_MODEL,
          verified: false, // requires admin approval
          isActive: true,
        },
      });
      added++;
    } catch (err) {
      logger.error({ message: 'Failed to insert trivia item', error: err.message });
    }
  }

  logger.info({ message: 'Trivia generated', added });
  return added;
}

/**
 * Generate and insert "Kya Aap Jaante Hain" facts.
 * @returns {Promise<number>} Count of items added
 */
async function generateFacts() {
  const recentTopics = await getRecentTopics('fact');
  const avoidHint = recentTopics.length > 0
    ? `\nAvoid facts similar to these recent ones: ${recentTopics.slice(0, 3).join(' | ')}`
    : '';

  const raw = await callGeminiPro(FACTS_PROMPT + avoidHint);
  const items = safeParseJson(raw, 'facts');
  if (!items || !Array.isArray(items)) return 0;

  let added = 0;
  for (const item of items) {
    try {
      await db.contentPool.create({
        data: {
          type: 'fact',
          content: item.content,
          tags: item.tags || ['fact'],
          source: item.source || 'AI generated',
          generatedBy: PRO_MODEL,
          verified: false,
          isActive: true,
        },
      });
      added++;
    } catch (err) {
      logger.error({ message: 'Failed to insert fact item', error: err.message });
    }
  }

  logger.info({ message: 'Facts generated', added });
  return added;
}

/**
 * Generate and insert Hanuman Chalisa chaupai commentaries.
 * @returns {Promise<number>} Count of items added
 */
async function generateChaupais() {
  const raw = await callGeminiPro(CHAUPAI_PROMPT);
  const items = safeParseJson(raw, 'chaupais');
  if (!items || !Array.isArray(items)) return 0;

  let added = 0;
  for (const item of items) {
    try {
      await db.contentPool.create({
        data: {
          type: 'hanuman_chaupai',
          content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
          tags: item.tags || ['hanuman_chalisa'],
          source: item.source || 'Hanuman Chalisa',
          generatedBy: PRO_MODEL,
          verified: false,
          isActive: true,
        },
      });
      added++;
    } catch (err) {
      logger.error({ message: 'Failed to insert chaupai item', error: err.message });
    }
  }

  logger.info({ message: 'Chaupais generated', added });
  return added;
}

// ---------------------------------------------------------------------------
// Main job processor
// ---------------------------------------------------------------------------

/**
 * Weekly content generation job.
 * Generates: 5 trivia questions, 3 "Kya Aap Jaante Hain" facts, 4 Hanuman Chalisa chaupais.
 * All content is inserted into ContentPool with verified: false (requires admin approval).
 * @param {Object} job - BullMQ job object
 * @returns {Promise<{ triviaAdded: number, factsAdded: number, chaupaisAdded: number }>}
 */
async function processContentGeneration(job) {
  logger.info({ message: 'contentGenerationJob started', jobId: job.id });
  const startedAt = Date.now();

  let triviaAdded = 0;
  let factsAdded = 0;
  let chaupaisAdded = 0;

  try {
    triviaAdded = await generateTrivia();
  } catch (err) {
    logger.error({ message: 'Trivia generation failed', error: err.message });
  }

  try {
    factsAdded = await generateFacts();
  } catch (err) {
    logger.error({ message: 'Facts generation failed', error: err.message });
  }

  try {
    chaupaisAdded = await generateChaupais();
  } catch (err) {
    logger.error({ message: 'Chaupais generation failed', error: err.message });
  }

  const duration = Date.now() - startedAt;
  const result = { triviaAdded, factsAdded, chaupaisAdded };

  logger.info({
    message: 'contentGenerationJob completed',
    jobId: job.id,
    durationMs: duration,
    ...result,
  });

  return result;
}

module.exports = { processContentGeneration };
