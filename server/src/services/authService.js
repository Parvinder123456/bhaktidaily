'use strict';

/**
 * Auth Service — Password-based authentication
 *
 * Handles password hashing, verification, and JWT issuance.
 * JWT payload: { userId, phone }  ·  expiry: 7 days
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const userService = require('./userService');
const logger = require('../utils/logger');

const JWT_EXPIRY = '7d';
const SALT_ROUNDS = 10;

/**
 * Sets (or resets) a user's password. Creates the user if they don't exist.
 *
 * @param {string} phone - E.164 phone number
 * @param {string} password - plaintext password
 */
async function setPassword(phone, password) {
  let user = await userService.findByPhone(phone);
  if (!user) {
    user = await userService.createUser(phone);
    logger.info({ message: 'authService: created new user for setPassword', phone });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  logger.info({ message: 'authService: password set', userId: user.id });
}

/**
 * Verifies phone + password and returns a signed JWT.
 * Throws on invalid credentials.
 *
 * @param {string} phone
 * @param {string} password
 * @returns {Promise<string>} JWT token
 */
async function loginWithPassword(phone, password) {
  const user = await db.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    const err = new Error('Invalid phone or password');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid phone or password');
    err.status = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  logger.info({ message: 'authService: password verified, JWT issued', userId: user.id });
  return token;
}

module.exports = { setPassword, loginWithPassword };
