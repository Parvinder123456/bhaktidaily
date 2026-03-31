'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const RASHI_OPTIONS = [
  'Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Sinh', 'Kanya',
  'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen',
];

const LANGUAGE_OPTIONS = [
  { value: 'en',       label: 'English' },
  { value: 'hi',       label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'both',     label: 'Both (EN + HI)' },
];

/**
 * TestMessageCard — Admin utility to fire a daily message on demand.
 *
 * Lets the admin pick any phone number, rashi, and language, then
 * immediately generates and delivers a WhatsApp message — without
 * waiting for the scheduled cron window.
 */
export default function TestMessageCard() {
  const [phone, setPhone]       = useState('');
  const [rashi, setRashi]       = useState('Mesh');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null); // { sent, preview } | null
  const [error, setError]       = useState('');

  async function handleSend() {
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await api.sendTestMessage({ phone: phone.trim(), rashi, language });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Test Message</span>
        <span style={styles.icon}>📨</span>
      </div>

      <p style={styles.hint}>
        Send an on-demand daily message to any WhatsApp number with custom preferences.
      </p>

      {/* Phone */}
      <label style={styles.label}>WhatsApp Phone</label>
      <input
        type="tel"
        placeholder="+91 98765 43210"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={styles.input}
        disabled={loading}
      />

      {/* Rashi + Language row */}
      <div style={styles.row}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Rashi</label>
          <select
            value={rashi}
            onChange={(e) => setRashi(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            {RASHI_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && <p style={styles.errorText}>{error}</p>}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={loading}
        className="btn-primary"
        style={styles.sendBtn}
      >
        {loading ? 'Sending…' : 'Send Test Message'}
      </button>

      {/* Success + preview */}
      {result?.sent && (
        <div style={styles.successBlock}>
          <div style={styles.successBadge}>✓ Delivered to WhatsApp</div>
          <p style={styles.previewLabel}>Message preview</p>
          <pre style={styles.preview}>{result.preview}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  card: {
    minWidth: '320px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  sectionLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-muted)',
  },
  icon: {
    fontSize: '1.25rem',
  },
  hint: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-primary)',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  row: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  fieldGroup: {
    flex: 1,
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.625rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-primary)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    outline: 'none',
  },
  errorText: {
    fontSize: '0.82rem',
    color: 'var(--color-error, #e05555)',
    marginBottom: '0.75rem',
  },
  sendBtn: {
    width: '100%',
    padding: '0.625rem 1rem',
    fontSize: '0.9rem',
  },
  successBlock: {
    marginTop: '1.25rem',
  },
  successBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(72, 187, 120, 0.12)',
    border: '1px solid rgba(72, 187, 120, 0.3)',
    color: '#48bb78',
    borderRadius: '20px',
    padding: '0.3rem 0.875rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  previewLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--color-text-muted)',
    marginBottom: '0.5rem',
  },
  preview: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '0.8rem',
    lineHeight: 1.6,
    color: 'var(--color-text-primary)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '0.875rem',
    maxHeight: '280px',
    overflowY: 'auto',
    fontFamily: 'inherit',
  },
};
