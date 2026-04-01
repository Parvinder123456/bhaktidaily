'use client';

import { useState, useEffect } from 'react';
import ToolPageLayout from '@/components/tools/ToolPageLayout';
import ToolResultCard from '@/components/tools/ToolResultCard';
import LeadCaptureForm from '@/components/tools/LeadCaptureForm';
import ShareButton from '@/components/tools/ShareButton';

/**
 * Aaj Ka Raashifal — /aaj-ka-raashifal
 *
 * User picks their rashi from a 3x4 grid, gets AI-generated daily horoscope
 * in the context of today's panchang, then opts in via LeadCaptureForm.
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

export default function AajKaRaashifalPage() {
  const [selectedRashi, setSelectedRashi] = useState(null);
  const [phase, setPhase] = useState('select'); // 'select' | 'loading' | 'result' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    document.title = 'Aaj Ka Raashifal — Daily Hindu Horoscope | Bhakti Daily';
  }, []);

  async function handleRashiClick(rashi) {
    setSelectedRashi(rashi);
    setPhase('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/tools/raashifal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rashi: rashi.key }),
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
          : 'Raashifal nahi mila. Phir se koshish karein.',
      );
      setPhase('error');
    }
  }

  function handleReset() {
    setPhase('select');
    setSelectedRashi(null);
    setResult(null);
    setErrorMsg('');
  }

  function buildShareText() {
    if (!result || !selectedRashi) return '';
    return (
      `${selectedRashi.symbol} ${selectedRashi.hindi} Raashifal\n\n` +
      `${result.raashifal}\n\n` +
      (result.tithi ? `Tithi: ${result.tithi}\n` : '') +
      (result.nakshatra ? `Nakshatra: ${result.nakshatra}\n` : '') +
      `\nApna raashifal jaanein: ${typeof window !== 'undefined' ? window.location.href : ''}`
    );
  }

  const resultSections =
    result && selectedRashi
      ? [
          {
            icon: selectedRashi.symbol,
            label: `${selectedRashi.hindi} Raashifal`,
            content: result.raashifal,
          },
        ]
      : [];

  return (
    <ToolPageLayout
      title="Aaj Ka Raashifal"
      subtitle="Apni rashi chunein aur aaj ka bhavishya jaanein"
    >
      {/* ---- Rashi selection grid (always visible above result) ---- */}
      <div style={styles.gridSection}>
        <p style={styles.gridLabel}>Apni rashi chunein</p>
        <div style={styles.rashiGrid}>
          {RASHIS.map((rashi) => {
            const isSelected = selectedRashi?.key === rashi.key;
            return (
              <button
                key={rashi.key}
                onClick={() => handleRashiClick(rashi)}
                disabled={phase === 'loading'}
                style={{
                  ...styles.rashiBtn,
                  ...(isSelected ? styles.rashiBtnSelected : {}),
                  ...(phase === 'loading' ? styles.rashiBtnDisabled : {}),
                }}
                title={rashi.english}
                aria-pressed={isSelected}
              >
                <span style={styles.rashiSymbol}>{rashi.symbol}</span>
                <span style={styles.rashiHindi}>{rashi.hindi}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Loading ---- */}
      {phase === 'loading' && (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner} aria-hidden="true">ॐ</div>
          <p style={styles.loadingText}>Aapka raashifal nikala ja raha hai...</p>
        </div>
      )}

      {/* ---- Error ---- */}
      {phase === 'error' && (
        <div style={styles.errorWrapper}>
          <div style={styles.errorBox} role="alert">
            {errorMsg}
          </div>
          <button onClick={handleReset} style={styles.retryBtn}>
            Dobara koshish karein
          </button>
        </div>
      )}

      {/* ---- Result ---- */}
      {phase === 'result' && result && selectedRashi && (
        <div className="fade-in">
          <p style={styles.resultIntro}>
            <span style={styles.resultRashi}>
              {selectedRashi.symbol} {selectedRashi.hindi}
            </span>{' '}
            ka aaj ka raashifal:
          </p>

          <ToolResultCard sections={resultSections} />

          {/* Tithi / Nakshatra snippet */}
          {(result.tithi || result.nakshatra) && (
            <div style={styles.panchangSnippet}>
              {result.tithi && (
                <span style={styles.snippetItem}>
                  <span style={styles.snippetIcon}>📅</span> {result.tithi}
                </span>
              )}
              {result.nakshatra && (
                <span style={styles.snippetItem}>
                  <span style={styles.snippetIcon}>⭐</span> {result.nakshatra}
                </span>
              )}
            </div>
          )}

          <ShareButton
            text={buildShareText()}
            url={typeof window !== 'undefined' ? window.location.href : ''}
          />

          <LeadCaptureForm
            toolName="raashifal"
            metadata={{ rashi: selectedRashi.key }}
          />

          <div style={styles.tryAnotherWrapper}>
            <button onClick={handleReset} style={styles.tryAnotherBtn}>
              Doosri rashi dekhein
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
  /* Rashi grid */
  gridSection: {
    marginBottom: '2rem',
  },
  gridLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#C8A96E',
    marginBottom: '0.875rem',
    fontFamily: FONT_DEVANAGARI,
  },
  rashiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.6rem',
  },
  rashiBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    padding: '0.75rem 0.5rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(255,153,51,0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, background 150ms ease',
    fontFamily: FONT_DEVANAGARI,
    minHeight: '72px',
  },
  rashiBtnSelected: {
    background: 'rgba(255,153,51,0.14)',
    border: '1.5px solid #FF9933',
    boxShadow: '0 0 0 2px rgba(255,153,51,0.25)',
  },
  rashiBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  rashiSymbol: {
    fontSize: '1.5rem',
    lineHeight: 1,
    color: '#FFD700',
  },
  rashiHindi: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#F5ECD7',
    fontFamily: FONT_DEVANAGARI,
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

  /* Error */
  errorWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'flex-start',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    color: '#FCA5A5',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    fontFamily: FONT_DEVANAGARI,
    width: '100%',
  },
  retryBtn: {
    padding: '0.65rem 1.25rem',
    background: 'rgba(255,153,51,0.1)',
    border: '1px solid rgba(255,153,51,0.3)',
    color: '#FF9933',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: FONT_DEVANAGARI,
  },

  /* Result */
  resultIntro: {
    fontSize: '1.05rem',
    color: '#C8A96E',
    marginBottom: '1.25rem',
    fontFamily: FONT_DEVANAGARI,
  },
  resultRashi: {
    color: '#FFD700',
    fontWeight: 700,
  },

  /* Panchang snippet */
  panchangSnippet: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    background: 'rgba(255,215,0,0.06)',
    borderRadius: '10px',
    border: '1px solid rgba(255,215,0,0.15)',
  },
  snippetItem: {
    fontSize: '0.875rem',
    color: '#C8A96E',
    fontFamily: FONT_DEVANAGARI,
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  snippetIcon: {
    fontSize: '1rem',
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
