'use client';

import { api } from './api';

const TOKEN_KEY = 'bhakti_token';

/**
 * Authenticates with phone + password and stores the returned JWT.
 * @param {string} phone
 * @param {string} password
 * @returns {Promise<string>} the JWT token
 */
export async function login(phone, password) {
  const data = await api.login(phone, password);
  if (data?.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  return data?.token;
}

/**
 * Clears the stored JWT from localStorage.
 */
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Returns the stored JWT, or null if not present.
 * @returns {string|null}
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Returns true if a JWT is present in storage (does not validate expiry).
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getToken();
}
