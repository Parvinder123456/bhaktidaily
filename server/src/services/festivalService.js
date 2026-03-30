'use strict';

const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Returns the currently active festival campaign for a given date, if any.
 * @param {Date} [date] - Date to check (defaults to today IST)
 * @returns {Promise<object|null>} The active campaign or null
 */
async function getActiveCampaign(date) {
  try {
    const checkDate = date || new Date(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    );

    const campaign = await db.festivalCampaign.findFirst({
      where: {
        isActive: true,
        startDate: { lte: checkDate },
        endDate: { gte: checkDate },
      },
      include: { days: true },
    });

    return campaign;
  } catch (err) {
    logger.error({ message: 'Failed to get active campaign', error: err.message });
    return null;
  }
}

/**
 * Returns the day-specific content for a campaign on a given date.
 * @param {object} campaign - Campaign with days relation loaded
 * @param {Date} [date] - Date to check
 * @returns {object|null} { dayNumber, title, content }
 */
function getCampaignDay(campaign, date) {
  if (!campaign || !campaign.days || campaign.days.length === 0) return null;

  const checkDate = date || new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  const startDate = new Date(campaign.startDate);
  const diffMs = checkDate.getTime() - startDate.getTime();
  const dayNumber = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

  const dayContent = campaign.days.find(d => d.dayNumber === dayNumber);
  return dayContent || null;
}

/**
 * Returns today's festival content formatted for inclusion in the daily message.
 * Returns null if no active campaign.
 * @returns {Promise<{title: string, text: string}|null>}
 */
async function getTodayFestivalContent() {
  try {
    const campaign = await getActiveCampaign();
    if (!campaign) return null;

    const dayContent = getCampaignDay(campaign);
    if (!dayContent) return null;

    const content = dayContent.content || {};

    // Build a formatted text from the content JSON
    let text = '';
    if (content.goddess) text += `🙏 Aaj ki Devi: *${content.goddess}*\n`;
    if (content.color) text += `🎨 Aaj ka Rang: ${content.color}\n`;
    if (content.mantra) text += `🕉️ Mantra: _${content.mantra}_\n`;
    if (content.story) text += `📖 ${content.story}`;

    return {
      title: `${campaign.name} — Din ${dayContent.dayNumber}: ${dayContent.title}`,
      text: text.trim(),
    };
  } catch (err) {
    logger.error({ message: 'Failed to get today festival content', error: err.message });
    return null;
  }
}

module.exports = {
  getActiveCampaign,
  getCampaignDay,
  getTodayFestivalContent,
};
