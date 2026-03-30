'use strict';

const { getClient } = require('../config/gemini');
const logger = require('../utils/logger');

const MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Generates text using Gemini with exponential backoff retry on rate-limit / server errors.
 *
 * @param {string} prompt - User prompt content
 * @param {string} [systemInstruction] - Optional system prompt
 * @returns {Promise<string>} - Generated text
 */
async function generateText(prompt, systemInstruction) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = getClient();

      const modelOptions = { model: MODEL };
      if (systemInstruction) {
        modelOptions.systemInstruction = systemInstruction;
      }

      const model = client.getGenerativeModel(modelOptions);
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (!text) throw new Error('Empty response from Gemini');

      return text;
    } catch (err) {
      lastError = err;
      const status = err.status || err.statusCode;

      // Retry on 429 (rate limit) or 5xx (server errors)
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn({
          message: `Gemini API error — retrying (attempt ${attempt}/${MAX_RETRIES})`,
          status,
          delay,
          error: err.message,
        });
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries exhausted
      logger.error({ message: 'Gemini API failed', status, error: err.message });
      throw err;
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generateText };
