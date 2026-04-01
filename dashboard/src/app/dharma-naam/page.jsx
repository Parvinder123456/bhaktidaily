'use client';

import { useState, useEffect } from 'react';
import ToolPageLayout from '@/components/tools/ToolPageLayout';
import LeadCaptureForm from '@/components/tools/LeadCaptureForm';
import ShareButton from '@/components/tools/ShareButton';

/**
 * Dharma Naam — /dharma-naam
 *
 * User enters their current name + rashi, gets 3 spiritually-derived
 * Dharma names with Devanagari, meaning, deity association, and usage guidance.
 */

const RASHIS = [
  { key: 'Mesh', hindi: 'मेष', symbol: '♈', english: 'Aries' },
  { key: 'Vrishabh', hindi: 'वृषभ', symbol: '♉', english: 'Taurus' },
  { key: 'Mithun', hindi: 'मिथुन', symbol: '♊', english: 'Gemini' },
  { key: 'Kark', hindi: 'कर्क', symbol: '♋', english: 'Cancer' },
  { key: 'Singh', hindi: 'सिंह', symbol: '♌', english: 'Leo' },
  { key: 'Kanya', hindi: 'कन्या', symbol: '♍', english: 'Virgo' },
  { key: 'Tula', hindi: 'तुला', symbol: '♎', english: 'Libra' },
  { key: 'Vrishchik', hindi: 'वृश्चिक', symbol: '♏', english: 'Scorpio' },
  { key: 'Dhanu', hindi: 'धनु', symbol: '♐', english: 'Sagittarius' },
  { key: 'Makar', hindi: 'मकर', symbol: '♑', english: 'Capricorn' },
  { key: 'Kumbh', hindi: 'कुम्भ', symbol: '♒', english: 'Aquarius' },
  { key: 'Meen', hindi: 'मीन', symbol: '♓', english: 'Pisces' },
];

export default function DharmaNaamPage() {
  const [currentName, setCurrentName] = useState('');
  const [rashi, setRashi] = useState('');
  const [phase, setPhase] = useState('input'); // 'input' | 'loading' | 'result' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isValid = currentName.trim().length > 0 && rashi.length > 0;

  useEffect(() => {
    document.title = 'Dharma Naam — Apna Aatmik Naam Paayein | Bhakti Daily';
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;

    setPhase('loading');
    setErrorMsg('');
    setResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/tools/dharma-naam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentName: currentName.trim(), rashi }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setPhase('result');
    } catch (err) {
      setErrorMsg(
        err.message.includes('429')
          ? 'Bahut zyada requests. Thodi der baad phir koshish karein.'
          : 'Dharma naam nahi mila. Phir se koshish karein.',
      );
      setPhase('error');
    }
  }

  function handleReset() {
    setPhase('input');
    setCurrentName('');
    setRashi('');
    setResult(null);
    setErrorMsg('');
  }

  function buildShareTextForName(name) {
    return (
      `🕉️ Mera Dharma Naam: ${name.devanagariName} (${name.romanName})\n\n` +
      `💫 Arth: ${name.meaning}\n` +
      `🙏 Devta: ${name.deity}\n` +
      `🌟 Upyog: ${name.howToUse}\n\n` +
      `Apna dharma naam paayein: ${typeof window !== 'undefined' ? window.location.href : ''}`
    );
  }

  function buildOgUrl(name) {
    return (
      `/api/og/naam` +
      `?name=${encodeURIComponent(name.romanName)}` +
      `&meaning=${encodeURIComponent(name.meaning)}` +
      `&deity=${encodeURIComponent(name.deity)}`
    );
  }

  const selectedRashi = RASHIS.find((r) => r.key === rashi);

  return (
    <ToolPageLayout
      title="Dharma Naam"
      subtitle="Apna aatmik naam apni rashi aur shastra ke anusar paayein"
    >
      {/* ---- Input phase ---- */}
      {(phase === 'input' || phase === 'error') && (
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {/* Current name */}
          <div style={styles.fieldGroup}>
            <label htmlFor="current-naam" style={styles.inputLabel}>
              Aapka naam
            </label>
            <input
              id="current-naam"
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              placeholder="jaise ki: Rahul, Priya, Suresh..."
              style={styles.textInput}
              maxLength={60}
              autoComplete="given-name"
              autoFocus
            />
          </div>

          {/* Rashi dropdown */}
          <div style={styles.fieldGroup}>
            <label htmlFor="rashi-select" style={styles.inputLabel}>
              Aapki Rashi
            </label>
            <div style={styles.selectWrapper}>
              <select
                id="rashi-select"
                value={rashi}
                onChange={(e) => setRashi(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Rashi chunein --</option>
                {RASHIS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.symbol} {r.hindi} ({r.english})
                  </option>
                ))}
              </select>
              <span style={styles.selectArrow} aria-hidden="true">▾</span>
            </div>
          </div>

          {phase === 'error' && (
            <div style={styles.errorBox} role="alert">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid}
            style={{
              ...styles.submitBtn,
              ...(!isValid ? styles.submitBtnDisabled : {}),
            }}
          >
            Mera Dharma Naam Jaanein
          </button>
        </form>
      )}

      {/* ---- Loading phase ---- */}
      {phase === 'loading' && (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner} aria-hidden="true">ॐ</div>
          <p style={styles.loadingText}>
            Aapke liye divya naam dhundhe ja rahe hain...
          </p>
        </div>
      )}

      {/* ---- Result phase ---- */}
      {phase === 'result' && result && (
        <div className="fade-in">
          <p style={styles.resultIntro}>
            <span style={styles.resultName}>{currentName.trim()}</span> ke liye{' '}
            {selectedRashi && (
              <span style={styles.resultRashi}>
                {selectedRashi.symbol} {selectedRashi.hindi}
              </span>
            )}{' '}
            rashi ke divya naam:
          </p>

          {/* Name cards */}
          <div style={styles.nameCardsWrapper}>
            {(result.names || []).map((name, idx) => (
              <div key={idx} style={styles.nameCard} className="fade-in">
                {/* Devanagari name — large */}
                <div style={styles.nameCardHeader}>
                  <span style={styles.devanagariName}>{name.devanagariName}</span>
                  <span style={styles.romanName}>{name.romanName}</span>
                </div>

                {/* Meaning / Deity / Usage */}
                <div style={styles.nameSections}>
                  <div style={styles.nameSection}>
                    <span style={styles.nameSectionIcon} aria-hidden="true">💫</span>
                    <div>
                      <span style={styles.nameSectionLabel}>Arth</span>
                      <p style={styles.nameSectionContent}>{name.meaning}</p>
                    </div>
                  </div>
                  <div style={styles.nameSection}>
                    <span style={styles.nameSectionIcon} aria-hidden="true">🙏</span>
                    <div>
                      <span style={styles.nameSectionLabel}>Devta</span>
                      <p style={styles.nameSectionContent}>{name.deity}</p>
                    </div>
                  </div>
                  <div style={styles.nameSection}>
                    <span style={styles.nameSectionIcon} aria-hidden="true">🌟</span>
                    <div>
                      <span style={styles.nameSectionLabel}>Upyog</span>
                      <p style={styles.nameSectionContent}>{name.howToUse}</p>
                    </div>
                  </div>
                </div>

                {/* Per-name share + OG certificate */}
                <div style={styles.nameCardActions}>
                  <ShareButton
                    text={buildShareTextForName(name)}
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                  />
                  <a
                    href={buildOgUrl(name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.ogLink}
                  >
                    Certificate dekho
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Lead capture — once after all names */}
          <LeadCaptureForm
            toolName="dharma_naam"
            metadata={{ currentName: currentName.trim(), rashi }}
          />

          <div style={styles.tryAnotherWrapper}>
            <button onClick={handleReset} style={styles.tryAnotherBtn}>
              Doosra naam jaanein
            </button>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}

/* ---- Styles ---- */
const FONT_DEVANAGARI =
  '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif';

const styles = {
  /* Form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    maxWidth: '440px',
    margin: '0 auto',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  inputLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#C8A96E',
    fontFamily: FONT_DEVANAGARI,
  },
  textInput: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,153,51,0.35)',
    borderRadius: '12px',
    padding: '0.875rem 1rem',
    fontSize: '1.1rem',
    color: '#F5ECD7',
    outline: 'none',
    fontFamily: FONT_DEVANAGARI,
    width: '100%',
    transition: 'border-color 150ms ease',
  },
  selectWrapper: {
    position: 'relative',
    width: '100%',
  },
  select: {
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,153,51,0.35)',
    borderRadius: '12px',
    padding: '0.875rem 2.5rem 0.875rem 1rem',
    fontSize: '1rem',
    color: '#F5ECD7',
    outline: 'none',
    fontFamily: FONT_DEVANAGARI,
    width: '100%',
    cursor: 'pointer',
    transition: 'border-color 150ms ease',
  },
  selectArrow: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#FF9933',
    fontSize: '0.875rem',
    pointerEvents: 'none',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    color: '#FCA5A5',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    fontFamily: FONT_DEVANAGARI,
  },
  submitBtn: {
    padding: '0.9rem 1rem',
    background: 'linear-gradient(135deg, #FF6B21, #FF9933)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
    fontFamily: FONT_DEVANAGARI,
  },
  submitBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },

  /* Loading */
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.25rem',
    padding: '3rem 0',
  },
  spinner: {
    fontSize: '3rem',
    color: '#FFD700',
    animation: 'spin 2s linear infinite',
    display: 'inline-block',
    fontFamily: '"Noto Sans Devanagari", "Mangal", serif',
  },
  loadingText: {
    fontSize: '1rem',
    color: '#C8A96E',
    textAlign: 'center',
    fontFamily: FONT_DEVANAGARI,
  },

  /* Result */
  resultIntro: {
    fontSize: '1.05rem',
    color: '#C8A96E',
    marginBottom: '1.5rem',
    fontFamily: FONT_DEVANAGARI,
    lineHeight: 1.6,
  },
  resultName: {
    color: '#FFD700',
    fontWeight: 700,
  },
  resultRashi: {
    color: '#FF9933',
    fontWeight: 600,
  },

  /* Name cards */
  nameCardsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  nameCard: {
    background: 'linear-gradient(145deg, #FFFDF5 0%, #FFF8E7 100%)',
    border: '1.5px solid #C8860A',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(255,140,0,0.15), 0 1px 4px rgba(0,0,0,0.25)',
    animation: 'fadeIn 0.45s ease both',
  },
  nameCardHeader: {
    background: 'linear-gradient(135deg, rgba(255,153,51,0.12), rgba(255,215,0,0.08))',
    borderBottom: '1px solid rgba(200,134,10,0.2)',
    padding: '1.5rem 1.5rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    textAlign: 'center',
  },
  devanagariName: {
    fontFamily:
      '"Yatra One", "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", serif',
    fontSize: '36px',
    color: '#7A4A00',
    lineHeight: 1.2,
    letterSpacing: '0.02em',
  },
  romanName: {
    fontSize: '1rem',
    color: '#9E6A00',
    fontFamily: '"Inter", "Noto Sans", system-ui, sans-serif',
    letterSpacing: '0.08em',
    fontWeight: 500,
  },
  nameSections: {
    padding: '0.25rem 0',
  },
  nameSection: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.9rem 1.5rem',
    borderBottom: '1px solid rgba(200,134,10,0.12)',
  },
  nameSectionIcon: {
    fontSize: '1.2rem',
    lineHeight: 1,
    marginTop: '2px',
    flexShrink: 0,
  },
  nameSectionLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#C8860A',
    marginBottom: '0.2rem',
    fontFamily: FONT_DEVANAGARI,
  },
  nameSectionContent: {
    fontSize: '0.975rem',
    color: '#3D2A00',
    lineHeight: 1.65,
    fontFamily: FONT_DEVANAGARI,
    margin: 0,
  },
  nameCardActions: {
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: 'rgba(255,248,231,0.5)',
  },
  ogLink: {
    display: 'block',
    textAlign: 'center',
    padding: '0.6rem 1rem',
    background: 'rgba(255,153,51,0.08)',
    border: '1px solid rgba(255,153,51,0.3)',
    borderRadius: '10px',
    color: '#C8860A',
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
    fontFamily: FONT_DEVANAGARI,
    transition: 'background 150ms ease',
  },

  /* Try another */
  tryAnotherWrapper: {
    marginTop: '1.75rem',
    textAlign: 'center',
  },
  tryAnotherBtn: {
    padding: '0.65rem 1.5rem',
    background: 'transparent',
    border: '1px solid rgba(255,153,51,0.3)',
    color: '#9E8A6F',
    borderRadius: '10px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontFamily: FONT_DEVANAGARI,
    transition: 'color 150ms ease, border-color 150ms ease',
  },
};
