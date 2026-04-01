'use strict';

const db = require('../config/db');
const nameService = require('../services/nameService');
const dreamService = require('../services/dreamService');
const panchangService = require('../services/panchangService');
const calendarService = require('../services/calendarService');
const raashifalLensService = require('../services/raashifalLensService');
const aiService = require('../services/aiService');
const promptService = require('../services/promptService');
const { sendWhatsAppMessage } = require('../services/messageRouterService');
const logger = require('../utils/logger');

const VALID_RASHIS = ['Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Singh', 'Kanya', 'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen'];

const TOOL_LABELS = {
  name_meaning: 'Naam Ka Rahasya',
  panchang: 'Aaj Ka Panchang',
  raashifal: 'Aaj Ka Raashifal',
  dream: 'Swapna Phal',
  dharma_naam: 'Dharma Naam',
};

async function getNameMeaning(req, res) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Naam dena zaroori hai.' });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({ error: 'Naam bahut lamba hai. 50 akshar tak.' });
    }
    const result = await nameService.getNameMeaningStructured(name.trim());
    return res.json(result);
  } catch (err) {
    logger.error({ message: 'getNameMeaning error', error: err.message });
    return res.status(500).json({ error: 'Kuch gadbad ho gayi. Phir koshish karein.' });
  }
}

async function getTodayPanchang(req, res) {
  try {
    const now = new Date();
    const panchang = panchangService.getTodayPanchang();
    const dayDeity = calendarService.getDayDeity(now);
    const ritu = calendarService.getRitu(now);
    return res.json({ ...panchang, dayDeity, ritu });
  } catch (err) {
    logger.error({ message: 'getTodayPanchang error', error: err.message });
    return res.status(500).json({ error: 'Panchang load nahi ho saka.' });
  }
}

async function getMuhuratAdvice(req, res) {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Muhurat query dena zaroori hai.' });
    }
    const panchang = panchangService.getTodayPanchang();
    const prompt = promptService.buildPromptFromTemplate('muhurat_advice.txt', {
      ...panchang,
      query: query.trim(),
    });
    const advice = await aiService.generateText(prompt);
    return res.json({ advice });
  } catch (err) {
    logger.error({ message: 'getMuhuratAdvice error', error: err.message });
    return res.status(500).json({ error: 'Muhurat advice nahi mil saki.' });
  }
}

async function getRaashifal(req, res) {
  try {
    const { rashi } = req.body;
    if (!rashi || !VALID_RASHIS.includes(rashi)) {
      return res.status(400).json({ error: 'Valid rashi dena zaroori hai.', validRashis: VALID_RASHIS });
    }
    const now = new Date();
    const panchang = panchangService.getTodayPanchang();
    const lens = raashifalLensService.getLensForDate(now);
    const prompt = promptService.buildPromptFromTemplate('raashifal_public.txt', {
      rashi,
      tithi: panchang.tithi || 'N/A',
      nakshatra: panchang.nakshatra || 'N/A',
      lensLabel: lens.label,
      lensInject: lens.inject,
    });
    const raashifal = await aiService.generateText(prompt);
    return res.json({ rashi, raashifal, panchang: { tithi: panchang.tithi, nakshatra: panchang.nakshatra } });
  } catch (err) {
    logger.error({ message: 'getRaashifal error', error: err.message });
    return res.status(500).json({ error: 'Raashifal nahi mil saka.' });
  }
}

async function interpretDream(req, res) {
  try {
    const { dreamDescription, userName } = req.body;
    if (!dreamDescription || typeof dreamDescription !== 'string') {
      return res.status(400).json({ error: 'Sapne ka vivran dena zaroori hai.' });
    }
    if (dreamDescription.trim().length < 10 || dreamDescription.trim().length > 1000) {
      return res.status(400).json({ error: 'Vivran 10 se 1000 akshar ke beech hona chahiye.' });
    }
    if (!userName || typeof userName !== 'string' || userName.trim().length === 0 || userName.trim().length > 50) {
      return res.status(400).json({ error: 'Naam dena zaroori hai (1-50 akshar).' });
    }
    const result = await dreamService.interpretDreamStructured(dreamDescription.trim(), userName.trim());
    return res.json(result);
  } catch (err) {
    logger.error({ message: 'interpretDream error', error: err.message });
    return res.status(500).json({ error: 'Swapna phal nahi mil saka.' });
  }
}

async function getDharmaNaam(req, res) {
  try {
    const { currentName, rashi } = req.body;
    if (!currentName || typeof currentName !== 'string' || currentName.trim().length === 0) {
      return res.status(400).json({ error: 'Naam dena zaroori hai.' });
    }
    if (!rashi || !VALID_RASHIS.includes(rashi)) {
      return res.status(400).json({ error: 'Valid rashi dena zaroori hai.', validRashis: VALID_RASHIS });
    }
    const prompt = promptService.buildPromptFromTemplate('dharma_naam.txt', {
      currentName: currentName.trim(),
      rashi,
    });
    const rawResponse = await aiService.generateText(prompt);
    // Parse JSON array from response — strip any accidental markdown fences
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON array');
    }
    const names = JSON.parse(jsonMatch[0]);
    return res.json({ names });
  } catch (err) {
    logger.error({ message: 'getDharmaNaam error', error: err.message });
    return res.status(500).json({ error: 'Dharma Naam nahi mil saka.' });
  }
}

async function captureToolLead(req, res) {
  try {
    const { phone, toolName, metadata } = req.body;
    // Validate Indian mobile: +91 followed by 10 digits starting with 6-9
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Valid Indian mobile number dena zaroori hai (+91XXXXXXXXXX).' });
    }
    if (!toolName || !Object.keys(TOOL_LABELS).includes(toolName)) {
      return res.status(400).json({ error: 'Valid tool name required.' });
    }

    const lead = await db.toolLead.create({
      data: { phone, toolName, metadata: metadata || null },
    });

    const toolLabel = TOOL_LABELS[toolName];
    const nudgeMsg = `\u{1F549}\uFE0F Jai Shri Ram! Aapne ${toolLabel} try kiya. Ab roz subah divya sandesh paayein \u2014 bas *Haan* reply karein! \u{1F64F}`;

    // Fire and forget — don't block the response
    sendWhatsAppMessage(phone, nudgeMsg).catch((err) => {
      logger.error({ message: 'Lead WhatsApp nudge failed', leadId: lead.id, error: err.message });
    });

    return res.json({ success: true, leadId: lead.id });
  } catch (err) {
    logger.error({ message: 'captureToolLead error', error: err.message });
    return res.status(500).json({ error: 'Lead save nahi ho saka.' });
  }
}

module.exports = {
  getNameMeaning,
  getTodayPanchang,
  getMuhuratAdvice,
  getRaashifal,
  interpretDream,
  getDharmaNaam,
  captureToolLead,
};
