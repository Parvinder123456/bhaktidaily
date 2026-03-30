'use strict';

const userService = require('../services/userService');
const conversationService = require('../services/conversationService');
const promptService = require('../services/promptService');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * Handles a free-form chat message from an onboarded user.
 *
 * @param {string} phone - User's phone number
 * @param {string} incomingText - Message from the user
 * @returns {Promise<string>} - Reply text
 */
async function handleChat(phone, incomingText) {
  // 1. Load user profile
  const user = await userService.findByPhone(phone);
  if (!user) {
    return '🙏 I could not find your profile. Please send "Hi" to restart.';
  }

  // 2. Get conversation history (last 5 turns)
  const history = await conversationService.getHistory(user.id, 5);

  // 3. Build chat prompt
  const prompt = promptService.buildChatPrompt({
    user,
    history,
    question: incomingText,
  });

  const systemInstruction = promptService.getSystemInstruction();

  // 4. Generate AI response
  const reply = await aiService.generateText(prompt, systemInstruction);

  // 5. Persist both sides of the conversation
  await conversationService.saveMessage(user.id, 'user', incomingText);
  await conversationService.saveMessage(user.id, 'assistant', reply);

  logger.info({ message: 'Chat handled', userId: user.id });

  return reply;
}

module.exports = { handleChat };
