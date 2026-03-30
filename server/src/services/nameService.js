'use strict';

const aiService = require('./aiService');
const promptService = require('./promptService');
const logger = require('../utils/logger');

/**
 * Gets the spiritual meaning of a Hindu name using Gemini.
 *
 * @param {string} name - The name to look up
 * @returns {Promise<string>} Formatted name meaning message
 */
async function getNameMeaning(name) {
  try {
    logger.info({ message: 'Generating name meaning', name });

    const prompt = promptService.buildPromptFromTemplate('name_meaning.txt', { name });
    const systemInstruction = promptService.getSystemInstruction();

    const aiOutput = await aiService.generateText(prompt, systemInstruction);

    // Parse the structured output
    const parsed = parseNameOutput(aiOutput, name);

    // Format as a WhatsApp message
    const message =
      `✨ *Naam Ka Arth: ${name}*\n\n` +
      `📜 *Sanskrit Mool:* ${parsed.sanskritRoot}\n` +
      `🙏 *Devta Sambandh:* ${parsed.deityAssociation}\n` +
      `💫 *Arth:* ${parsed.meaning}\n\n` +
      `🙏 *Aashirvaad:* ${parsed.blessing}`;

    logger.info({ message: 'Name meaning generated', name });
    return message;
  } catch (err) {
    logger.error({ message: 'Failed to generate name meaning', name, error: err.message });
    return `🙏 "${name}" ek sundar naam hai jo Sanatan parampara se juda hai. Yeh naam aapko divya shakti aur aashirvaad deta hai.`;
  }
}

/**
 * Parses the AI output for name meaning into structured fields.
 */
function parseNameOutput(text, name) {
  const rootMatch = text.match(/SANSKRIT_ROOT[:\s]*([\s\S]+?)(?=DEVTA_SAMBANDH|$)/i);
  const deityMatch = text.match(/DEVTA_SAMBANDH[:\s]*([\s\S]+?)(?=ARTH|$)/i);
  const arthMatch = text.match(/ARTH[:\s]*([\s\S]+?)(?=AASHIRVAAD|$)/i);
  const blessingMatch = text.match(/AASHIRVAAD[:\s]*([\s\S]+?)$/i);

  return {
    sanskritRoot: rootMatch ? rootMatch[1].trim() : 'Sanskrit mool uplabdh nahi',
    deityAssociation: deityMatch ? deityMatch[1].trim() : 'Sanatan parampara se juda',
    meaning: arthMatch ? arthMatch[1].trim() : `${name} ek pavitra naam hai`,
    blessing: blessingMatch ? blessingMatch[1].trim() : `${name} naam ke dharak par sada Bhagwan ki kripa bani rahe`,
  };
}

module.exports = { getNameMeaning };
