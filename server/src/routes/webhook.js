'use strict';

const express = require('express');
const router = express.Router();
const { handleWebhook, handleVerification } = require('../controllers/webhookController');

// Meta webhook verification (one-time setup)
router.get('/whatsapp', handleVerification);

// Meta webhook incoming messages
router.post('/whatsapp', handleWebhook);

module.exports = router;
