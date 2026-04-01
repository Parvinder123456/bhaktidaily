'use strict';

const aiService = require('./aiService');
const promptService = require('./promptService');
const logger = require('../utils/logger');

/**
 * Interprets a dream in Hindu spiritual context using Gemini.
 *
 * @param {string} dreamDescription - The user's dream description
 * @param {string} userName - The user's name
 * @returns {Promise<string>} Formatted dream interpretation message
 */
async function interpretDream(dreamDescription, userName) {
  try {
    logger.info({ message: 'Interpreting dream', userName, descLength: dreamDescription.length });

    const prompt = promptService.buildPromptFromTemplate('dream_interpret.txt', {
      userName: userName || 'Bhakt',
      dreamDescription,
    });

    const systemInstruction = promptService.getSystemInstruction();
    const aiOutput = await aiService.generateText(prompt, systemInstruction);

    // Parse structured output
    const parsed = parseDreamOutput(aiOutput);

    // Format as WhatsApp message
    const message =
      `🌙 *Swapna Phal — ${userName || 'Bhakt'} ji*\n\n` +
      `🔮 *Swapna Ka Arth:*\n${parsed.interpretation}\n\n` +
      `📖 *Shastra Sandarbh:*\n${parsed.reference}\n\n` +
      `🙏 *Sujhaav:*\n${parsed.suggestion}\n\n` +
      `_Yaad rakhein — swapna divya sanket hain, bhavishyavani nahi. Bhagwan sada aapke saath hain._ 🙏`;

    logger.info({ message: 'Dream interpretation generated', userName });
    return message;
  } catch (err) {
    logger.error({ message: 'Failed to interpret dream', userName, error: err.message });
    return `🌙 ${userName || 'Bhakt'} ji, aapka swapna ek divya sanket ho sakta hai. Subah uthkar Hanuman Chalisa ka paath karein aur mann shant rakhein. Bhagwan aapki raksha kar rahe hain. 🙏`;
  }
}

/**
 * Parses the AI output for dream interpretation.
 */
function parseDreamOutput(text) {
  const interpMatch = text.match(/SWAPNA_PHAL[:\s]*([\s\S]+?)(?=SHASTRA_SANDARBH|$)/i);
  const refMatch = text.match(/SHASTRA_SANDARBH[:\s]*([\s\S]+?)(?=SUJHAAV|$)/i);
  const suggMatch = text.match(/SUJHAAV[:\s]*([\s\S]+?)$/i);

  return {
    interpretation: interpMatch ? interpMatch[1].trim() : text.trim(),
    reference: refMatch ? refMatch[1].trim() : 'Swapna Shastra ke anusaar yeh ek shubh sanket hai.',
    suggestion: suggMatch ? suggMatch[1].trim() : 'Subah Surya ko jal arpan karein aur Om ka jaap karein.',
  };
}

/**
 * Returns the structured parsed object for a dream interpretation.
 * Used by toolsController for the public-facing API.
 *
 * @param {string} dreamDescription - The user's dream description
 * @param {string} userName - The user's name
 * @returns {Promise<{ interpretation: string, reference: string, suggestion: string }>}
 */
async function interpretDreamStructured(dreamDescription, userName) {
  const prompt = promptService.buildPromptFromTemplate('dream_interpret.txt', {
    userName: userName || 'Bhakt',
    dreamDescription,
  });
  const systemInstruction = promptService.getSystemInstruction();
  const aiOutput = await aiService.generateText(prompt, systemInstruction);
  return parseDreamOutput(aiOutput);
}

module.exports = { interpretDream, interpretDreamStructured };
