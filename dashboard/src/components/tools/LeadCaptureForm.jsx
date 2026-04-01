'use client';

import { useState } from 'react';

/**
 * LeadCaptureForm — WhatsApp opt-in shown after a tool result.
 *
 * Props:
 *   toolName {string}  — One of: "name_meaning" | "panchang" | "raashifal" | "dream" | "dharma_naam"
 *   metadata {object}  — Tool-specific data to attach to the lead (e.g. { name: "Arjun" })
 */
export default function LeadCaptureForm({ toolName, metadata = {} }) {
  const [rawPhone, setRawPhone] = useState('');
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Normalize to +91XXXXXXXXXX
  function buildFullPhone(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const phone = buildFullPhone(rawPhone);
    if (!phone) {
      setError('Kripya sahi 10-digit mobile number dikhayein.');
      return;
    }
    if (!consented) {
      setError('WhatsApp sandesh prapt karne ki anumati deena zaroori hai.');
      return;
    }

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/tools/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, toolName, metadata }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err.message.includes('429')
          ? 'Bahut zyada requests. Thodi der baad phir koshish karein.'
          : `Kuch gadbad hui: ${err.message}`,
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={styles.successBox}>
        <span style={styles.successIcon}>✅</span>
        <p style={styles.successText}>
          Bahut sundar! Aapko abhi WhatsApp pe ek sandesh milega.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.dividerRow}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerLabel}>🙏 Roz paayein</span>
        <span style={styles.dividerLine} />
      </div>

      <div style={styles.card}>
        <p style={styles.heading}>
          Roz subah WhatsApp pe paayein — shloka, puja muhurat, aur divya sandesh
        </p>

        {error && (
          <div style={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Phone input */}
          <label style={styles.label} htmlFor="lead-phone">
            Aapka WhatsApp number
          </label>
          <div style={styles.phoneRow}>
            <span style={styles.prefix}>+91</span>
            <input
              id="lead-phone"
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={rawPhone}
              onChange={(e) => setRawPhone(e.target.value)}
              disabled={loading}
              maxLength={10}
              style={styles.phoneInput}
              autoComplete="tel-national"
            />
          </div>

          {/* Consent checkbox */}
          <label style={styles.consentLabel}>
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              disabled={loading}
              style={styles.checkbox}
            />
            <span style={styles.consentText}>
              Main roz subah WhatsApp pe divya sandesh paana chahta/chahti hoon
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !rawPhone || !consented}
            style={{
              ...styles.submitBtn,
              ...(loading || !rawPhone || !consented ? styles.submitBtnDisabled : {}),
            }}
          >
            {loading ? 'Bhej rahe hain...' : 'Roz WhatsApp pe divya sandesh paayein 🙏'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    marginTop: '2rem',
  },

  /* Divider */
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,153,51,0.25)',
  },
  dividerLabel: {
    fontSize: '0.85rem',
    color: '#FF9933',
    whiteSpace: 'nowrap',
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Inter", system-ui, sans-serif',
  },

  /* Card */
  card: {
    background: 'rgba(255,153,51,0.07)',
    border: '1px solid rgba(255,153,51,0.22)',
    borderRadius: '16px',
    padding: '1.5rem',
  },
  heading: {
    fontSize: '0.95rem',
    color: '#F5ECD7',
    lineHeight: 1.6,
    marginBottom: '1.25rem',
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif',
  },

  /* Error */
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    color: '#FCA5A5',
    fontSize: '0.875rem',
    padding: '0.65rem 0.9rem',
    marginBottom: '1rem',
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Inter", system-ui, sans-serif',
  },

  /* Form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#C8A96E',
    marginBottom: '0.25rem',
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Inter", system-ui, sans-serif',
  },

  /* Phone row */
  phoneRow: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,153,51,0.3)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  prefix: {
    padding: '0.75rem 0.875rem',
    fontSize: '0.95rem',
    color: '#FF9933',
    fontWeight: 600,
    borderRight: '1px solid rgba(255,153,51,0.25)',
    background: 'rgba(255,153,51,0.06)',
    userSelect: 'none',
    flexShrink: 0,
  },
  phoneInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: '0.75rem 0.875rem',
    fontSize: '1rem',
    color: '#F5ECD7',
    fontFamily: 'inherit',
    letterSpacing: '0.04em',
  },

  /* Consent */
  consentLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: '3px',
    width: '16px',
    height: '16px',
    flexShrink: 0,
    accentColor: '#FF9933',
    cursor: 'pointer',
  },
  consentText: {
    fontSize: '0.875rem',
    color: '#C8A96E',
    lineHeight: 1.55,
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif',
  },

  /* Submit button */
  submitBtn: {
    width: '100%',
    padding: '0.9rem 1rem',
    background: 'linear-gradient(135deg, #FF6B21, #FF9933)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.975rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 150ms ease, transform 150ms ease',
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif',
    letterSpacing: '0.01em',
    lineHeight: 1.4,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
    transform: 'none',
  },

  /* Success */
  successBox: {
    marginTop: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '14px',
    padding: '1.1rem 1.25rem',
  },
  successIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  successText: {
    fontSize: '0.975rem',
    color: '#86EFAC',
    lineHeight: 1.55,
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif',
  },
};
