'use strict';

const db = require('../config/db');

/**
 * Finds a user by phone number.
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
async function findByPhone(phone) {
  if (!phone) return null;
  return db.user.findUnique({ where: { phone } });
}

/**
 * Creates a new user with default values.
 * @param {string} phone
 * @returns {Promise<object>}
 */
async function createUser(phone) {
  return db.user.create({
    data: {
      phone,
      onboardingStep: 0,
      isOnboarded: false,
      streakCount: 0,
      language: 'en',
      deliveryTime: '07:00',
      timezone: 'Asia/Kolkata',
    },
  });
}

/**
 * Updates only the provided fields on a user identified by phone.
 * @param {string} phone
 * @param {object} data — only defined keys are updated
 * @returns {Promise<object>}
 */
async function updateUser(phone, data) {
  // Strip undefined values to avoid overwriting with null
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  return db.user.update({ where: { phone }, data: cleanData });
}

/**
 * Returns the current onboarding step (0-5) for the user.
 * @param {string} phone
 * @returns {Promise<number>}
 */
async function getOnboardingStep(phone) {
  const user = await findByPhone(phone);
  return user ? user.onboardingStep : 0;
}

/**
 * Sets the onboarding step for the user.
 * @param {string} phone
 * @param {number} step
 * @returns {Promise<object>}
 */
async function setOnboardingStep(phone, step) {
  return updateUser(phone, { onboardingStep: step });
}

/**
 * Marks the user as fully onboarded.
 * @param {string} phone
 * @returns {Promise<object>}
 */
async function markOnboarded(phone) {
  return updateUser(phone, { isOnboarded: true, onboardingStep: 5 });
}

module.exports = {
  findByPhone,
  createUser,
  updateUser,
  getOnboardingStep,
  setOnboardingStep,
  markOnboarded,
};
