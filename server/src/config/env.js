'use strict';

require('dotenv').config();

// Variables required to start serving (server will crash without these)
const CRITICAL_VARS = ['DATABASE_URL', 'JWT_SECRET'];

// Variables required for full functionality (server will start but features will be degraded)
// NOTE: Twilio has been replaced by Meta WhatsApp Cloud API.
// The 'twilio' npm package can be removed from package.json once migration is confirmed.
const SERVICE_VARS = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'GEMINI_API_KEY',
];

// Legacy alias — kept for backward compatibility
const REQUIRED_VARS = [...CRITICAL_VARS, ...SERVICE_VARS];

function validateEnv() {
  const missingCritical = CRITICAL_VARS.filter(key => !process.env[key]);
  const missingService = SERVICE_VARS.filter(key => !process.env[key]);

  if (missingService.length > 0) {
    console.warn(
      `[env] WARNING: Missing service environment variables: ${missingService.join(', ')}. ` +
        'Some features (WhatsApp messaging, AI generation) will be unavailable.'
    );
  }

  if (missingCritical.length > 0) {
    throw new Error(
      `Missing critical environment variables: ${missingCritical.join(', ')}\n` +
        'Please copy server/.env.example to server/.env and fill in all values.'
    );
  }
}

// Only validate in non-test environments
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  META_APP_SECRET: process.env.META_APP_SECRET,
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || 'v21.0',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // Optional: set to your Gemini tier's RPM limit. Default 10 = free tier.
  // Paid tier (gemini-2.5-flash): set to 1000 or higher.
  GEMINI_RPM: parseInt(process.env.GEMINI_RPM || '10', 10),
  JWT_SECRET: process.env.JWT_SECRET,
  validateEnv,
};
