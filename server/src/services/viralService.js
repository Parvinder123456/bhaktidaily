'use strict';

const crypto = require('crypto');
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Generates a unique 6-character referral code for a user.
 * @param {string} userId
 * @returns {Promise<string>} The generated referral code
 */
async function generateReferralCode(userId) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Return existing code if already generated
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate a unique 6-char alphanumeric code
    let code;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    do {
      code = crypto.randomBytes(4).toString('base64url').substring(0, 6).toUpperCase();
      const existing = await db.user.findUnique({ where: { referralCode: code } });
      if (!existing) break;
      attempts++;
    } while (attempts < MAX_ATTEMPTS);

    if (attempts >= MAX_ATTEMPTS) {
      // Fallback: use first 6 chars of userId hash
      code = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 6).toUpperCase();
    }

    await db.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    logger.info({ message: 'Referral code generated', userId, code });
    return code;
  } catch (err) {
    logger.error({ message: 'Failed to generate referral code', userId, error: err.message });
    throw err;
  }
}

/**
 * Applies a referral code — links the new user to the referrer.
 * @param {string} userId - The new user who is applying the code
 * @param {string} code - The referral code
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function applyReferral(userId, code) {
  try {
    const referrer = await db.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: { id: true, name: true },
    });

    if (!referrer) {
      return { success: false, message: 'Yeh referral code sahi nahi hai.' };
    }

    if (referrer.id === userId) {
      return { success: false, message: 'Aap apna khud ka referral code use nahi kar sakte!' };
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, referredBy: true },
    });

    if (user.referredBy) {
      return { success: false, message: 'Aapne pehle se ek referral code use kiya hai.' };
    }

    await db.user.update({
      where: { id: userId },
      data: { referredBy: referrer.id },
    });

    logger.info({ message: 'Referral applied', userId, referrerId: referrer.id, code });
    return {
      success: true,
      message: `🎉 Referral safal! ${referrer.name || 'Ek bhakt'} ne aapko Daily Dharma se judne mein madad ki.`,
    };
  } catch (err) {
    logger.error({ message: 'Failed to apply referral', userId, code, error: err.message });
    return { success: false, message: 'Referral mein kuch samasya aayi. Kripya phir prayaas karein.' };
  }
}

/**
 * Generates a milestone certificate message for WhatsApp.
 * @param {object} user - User record
 * @param {number} streakCount - The milestone streak count
 * @returns {string} Formatted milestone certificate message
 */
function generateMilestoneCertificate(user, streakCount) {
  const name = user.name || 'Bhakt';
  const whatsappNumber = process.env.TWILIO_WHATSAPP_FROM
    ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '').replace('+', '')
    : 'Daily Dharma';

  const milestoneMessages = {
    7: {
      title: '7 Din Ka Sadhana Praman Patra',
      emoji: '🔥',
      achievement: 'Saptha Divas Sadhak',
      message: 'Saptha — 7 pavitra din! Aapne lagaataar 7 din tak apni sadhana nibhaayi. Hindu parampara mein 7 ka ank bahut shubh hai — sapt rishi, sapt nadi, sapt swar.',
    },
    21: {
      title: '21 Din Ka Sadhana Praman Patra',
      emoji: '🌟',
      achievement: 'Niyamit Sadhak',
      message: 'Ikkeesvi — 21 din ki tapasya! Kehte hain 21 din mein aadat banti hai. Aapne ek adhyatmik aadat bana li hai. Yeh bahut badi uplabdhi hai!',
    },
    40: {
      title: '40 Din Ka Sadhana Praman Patra',
      emoji: '🙏',
      achievement: 'Tapasvi Sadhak',
      message: 'Chaalees din ki tapasya! Jaise rishiyon ne 40 din ki tapasya se divya shaktiyan paayi, aapki bhakti bhi gahari ho rahi hai.',
    },
    108: {
      title: '108 Din Ka Sadhana Praman Patra',
      emoji: '🕉️',
      achievement: 'Param Sadhak',
      message: '108 — Sanatan Dharm ka sabse pavitra ank! 108 mala ke moti, 108 Upanishad, 108 divya kshetra. Aap sachche Sadhak hain!',
    },
  };

  const milestone = milestoneMessages[streakCount];
  if (!milestone) return null;

  return `${milestone.emoji} *${milestone.title}* ${milestone.emoji}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `   🏆 *${milestone.achievement}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🙏 *${name} ji*\n\n` +
    `${milestone.message}\n\n` +
    `📅 Streak: *${streakCount} Din* lagaataar\n` +
    `🔥 Daily Dharma Sadhana\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `✨ Apne dosto ko bhi Daily Dharma join karwayein!\n` +
    `Unhe bhejein: wa.me/${whatsappNumber}?text=Hi 🙏`;
}

module.exports = {
  generateReferralCode,
  applyReferral,
  generateMilestoneCertificate,
};
