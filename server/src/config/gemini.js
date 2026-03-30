'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let clients = [];
let currentIndex = 0;

/**
 * Initialises one or more Gemini clients.
 * If GEMINI_API_KEY is comma-separated, creates a client per key for round-robin rotation.
 */
function initClients() {
  if (clients.length > 0) return;

  const raw = process.env.GEMINI_API_KEY || '';
  const keys = raw
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  clients = keys.map(apiKey => new GoogleGenerativeAI(apiKey));
  logger.info({ message: `Gemini: initialised ${clients.length} client(s)` });
}

/**
 * Returns the next Gemini client in round-robin order.
 * @returns {import('@google/generative-ai').GoogleGenerativeAI}
 */
function getClient() {
  if (clients.length === 0) initClients();
  const client = clients[currentIndex % clients.length];
  currentIndex = (currentIndex + 1) % clients.length;
  return client;
}

module.exports = { getClient, initClients };
