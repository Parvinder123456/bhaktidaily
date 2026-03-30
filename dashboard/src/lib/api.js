'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Thin fetch wrapper that automatically:
 *  - Prefixes the base API URL
 *  - Attaches a Bearer JWT from localStorage (client side only)
 *  - Parses JSON responses
 *  - Throws an Error with `message` populated from the response body on non-2xx
 *
 * @param {string} path - e.g. '/api/user/profile'
 * @param {RequestInit} options - standard fetch options
 * @returns {Promise<any>} parsed JSON
 */
async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach JWT if available (browser only)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bhakti_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Exported API helpers
// ---------------------------------------------------------------------------

export const api = {
  // Auth
  login: (phone, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  // User profile
  getProfile: () => apiFetch('/api/user/profile'),

  updateProfile: (data) =>
    apiFetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Streak
  getStreak: () => apiFetch('/api/user/streak'),

  // Messages
  getMessages: (page = 1) => apiFetch(`/api/messages?page=${page}`),

  getMessage: (id) => apiFetch(`/api/messages/${id}`),

  // Media configuration
  getMedia: () => apiFetch('/api/media'),

  upsertMedia: (data) =>
    apiFetch('/api/media', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteMedia: (key) =>
    apiFetch(`/api/media/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // Admin intelligence endpoints
  // ---------------------------------------------------------------------------

  // S1-T6: Content pool gauge data
  // Returns: { trivia: { unused, total, lastGenerated }, facts: {...}, chaupais: {...} }
  getContentPoolLevels: () => apiFetch('/api/admin/content/pool-levels'),

  // S2-T5: Today's prompt variation (lens + active user count)
  // Returns: { lens: { key, label, description }, scenarioSampleSize, activeUserCount }
  getPromptToday: () => apiFetch('/api/admin/prompt/today'),

  // S3-T5: Next 7 days of Hindu calendar events
  // Returns: Array<{ date: string, events: HinduCalendarEvent[] }>
  getCalendarThisWeek: () => apiFetch('/api/admin/calendar/thisweek'),

  // S3-T5: Engagement tier distribution
  // Returns: { high: number, medium: number, low: number, total: number }
  getEngagementDistribution: () => apiFetch('/api/admin/engagement/distribution'),

  // S4-T5: A/B variant performance
  // Returns: { variants: Array<{ id, style, lastReplyRate, userCount, isWinner }>, lastRotation, usersMoved }
  getVariantPerformance: (featureKey = 'bhagwan_sandesh') =>
    apiFetch(`/api/admin/variants/performance?featureKey=${encodeURIComponent(featureKey)}`),

  // S4-T5: Current weekly narrative theme
  // Returns: { themeSanskrit, themeEnglish, teaching, arcBeat, arcInstruction, cycleWeek, cycle }
  getCurrentTheme: () => apiFetch('/api/admin/theme/current'),

  // S5: Latest AI insight report
  // Returns: { report: InsightReport | null, message?: string }
  getLatestInsight: () => apiFetch('/api/admin/insights/latest'),

  // ---------------------------------------------------------------------------
  // Media file upload (multipart/form-data)
  // ---------------------------------------------------------------------------

  /**
   * Upload a file to Supabase Storage via the backend.
   * @param {File} file - browser File object
   * @returns {Promise<{ url: string, filename: string, mimetype: string, size: number }>}
   */
  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('bhakti_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/api/admin/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data;
    try { data = await response.json(); } catch { data = {}; }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
    }

    return data;
  },
};
