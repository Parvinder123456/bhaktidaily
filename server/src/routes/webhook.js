'use strict';

const express = require('express');
const router = express.Router();
const twilioAuth = require('../middleware/twilioAuth');
const { handleWebhook } = require('../controllers/webhookController');

// Twilio sends URL-encoded POST bodies
router.post('/whatsapp', twilioAuth, handleWebhook);

module.exports = router;
