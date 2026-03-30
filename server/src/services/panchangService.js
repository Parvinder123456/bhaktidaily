'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Load panchang data lazily
let panchangData = null;

/**
 * Loads the panchang JSON for the given year.
 * @param {number} year
 * @returns {object}
 */
function loadPanchangData(year) {
  const filePath = path.join(__dirname, '../../data/panchang', `${year}.json`);
  if (!fs.existsSync(filePath)) {
    logger.warn({ message: `Panchang data file not found for year ${year}`, filePath });
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Returns panchang data for today (IST).
 * @returns {object|null}
 */
function getTodayPanchang() {
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return getPanchangForDate(todayIST);
}

/**
 * Returns panchang data for a specific date string (YYYY-MM-DD).
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {object|null}
 */
function getPanchangForDate(dateStr) {
  try {
    const year = parseInt(dateStr.split('-')[0], 10);

    if (!panchangData || !panchangData[dateStr]) {
      panchangData = loadPanchangData(year);
    }

    const entry = panchangData[dateStr];
    if (!entry) {
      logger.warn({ message: 'No panchang data for date', date: dateStr });
      return getFallbackPanchang(dateStr);
    }

    return entry;
  } catch (err) {
    logger.error({ message: 'Error loading panchang data', error: err.message });
    return getFallbackPanchang(dateStr);
  }
}

/**
 * Generates fallback panchang data based on day-of-week rules when JSON data is unavailable.
 * @param {string} dateStr
 * @returns {object}
 */
function getFallbackPanchang(dateStr) {
  const date = new Date(dateStr + 'T00:00:00+05:30');
  const dow = date.getDay();

  const rahuKaalMap = {
    0: '4:30 PM - 6:00 PM',
    1: '7:30 AM - 9:00 AM',
    2: '3:00 PM - 4:30 PM',
    3: '12:00 PM - 1:30 PM',
    4: '1:30 PM - 3:00 PM',
    5: '10:30 AM - 12:00 PM',
    6: '9:00 AM - 10:30 AM',
  };

  const shubhRangMap = {
    0: 'Orange', 1: 'White', 2: 'Red', 3: 'Green',
    4: 'Yellow', 5: 'Pink', 6: 'Blue/Black',
  };

  const shubhAnkMap = { 0: 1, 1: 2, 2: 9, 3: 5, 4: 3, 5: 6, 6: 8 };

  const varNames = {
    0: 'Ravivaar', 1: 'Somvaar', 2: 'Mangalvaar', 3: 'Budhvaar',
    4: 'Guruvaar', 5: 'Shukravaar', 6: 'Shanivaar',
  };

  return {
    tithi: 'Data unavailable',
    nakshatra: 'Data unavailable',
    rahuKaal: rahuKaalMap[dow],
    shubhRang: shubhRangMap[dow],
    shubhAnk: shubhAnkMap[dow],
    var: varNames[dow],
    paksha: 'Shukla',
  };
}

module.exports = { getTodayPanchang, getPanchangForDate };
