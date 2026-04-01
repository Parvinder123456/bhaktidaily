'use strict';

const express = require('express');
const router = express.Router();
const { toolsLimiter } = require('../middleware/rateLimiter');
const toolsController = require('../controllers/toolsController');

// All tool routes are rate-limited but NOT JWT-protected
router.use(toolsLimiter);

// Tool 1: Name Meaning
router.post('/name-meaning', toolsController.getNameMeaning);

// Tool 2: Panchang
router.get('/panchang/today', toolsController.getTodayPanchang);
router.post('/panchang/muhurat', toolsController.getMuhuratAdvice);

// Tool 3: Raashifal
router.post('/raashifal', toolsController.getRaashifal);

// Tool 4: Dream Interpretation
router.post('/dream-interpret', toolsController.interpretDream);

// Tool 5: Dharma Naam
router.post('/dharma-naam', toolsController.getDharmaNaam);

// Lead capture (shared across all tools)
router.post('/leads', toolsController.captureToolLead);

module.exports = router;
