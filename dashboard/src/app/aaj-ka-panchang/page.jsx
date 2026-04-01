'use client';

import { useState, useEffect } from 'react';
import ToolPageLayout from '@/components/tools/ToolPageLayout';
import ToolResultCard from '@/components/tools/ToolResultCard';
import LeadCaptureForm from '@/components/tools/LeadCaptureForm';
import ShareButton from '@/components/tools/ShareButton';

/**
 * Aaj Ka Panchang — /aaj-ka-panchang
 *
 * Two sections:
 *  1. Auto-loaded daily panchang (no user input)
 *  2. Muhurat Advisor — user types intent, gets AI shubh muhurat advice
 */
export default function AajKaPanchangPage() {
  const [panchangPhase, setPanchangPhase] = useState('loading'); // 'loading' | 'result' | 'error'
  const [panchang, setPanchang] = useState(null);
  const [panchangError, setPanchangError] = useState('');

  const [muhuratQuery, setMuhuratQuery] = useState('');
  const [muhuratPhase, setMuhuratPhase] = useState('input'); // 'input' | 'loading' | 'result' | 'error'
  const [muhuratResult, setMuhuratResult] = useState('');
  const [muhuratError, setMuhuratError] = useState('');

  useEffect(() => {
    document.title = 'Aaj Ka Panchang — Hindu Calendar & Muhurat | Bhakti Daily';
  }, []);

  // Auto-load panchang on mount
  useEffect(() => {
    async function fetchPanchang() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/tools/panchang/today`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Server error ${res.status}`);
        }
        const data = await res.json();
        setPanchang(data);
        setPanchangPhase('result');
      } catch (err) {
        setPanchangError('Panchang load nahi ho saka. Page refresh karein.');
        setPanchangPhase('error');
      }
    }
    fetchPanchang();
  }, []);

  async function handleMuhuratSubmit(e) {
    e.preventDefault();
    const trimmed = muhuratQuery.trim();
    if (!trimmed) return;

    setMuhuratPhase('loading');
    setMuhuratResult('');
    setMuhuratError('');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/tools/panchang/muhurat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setMuhuratResult(data.muhurat || data.result || JSON.stringify(data));
      setMuhuratPhase('result');
    } catch (err) {
      setMuhuratError(
        err.message.includes('429')
          ? 'Bahut zyada requests. Thodi der baad phir koshish karein.'
          : 'Muhurat nahi mila. Phir se koshish karein.',
      );
      setMuhuratPhase('error');
    }
  }

  function buildShareText() {
    if (!panchang) return '';
    const lines = [
      '🕉️ Aaj Ka Panchang',
      '',
      `📅 Tithi: ${panchang.tithi}`,
      `⭐ Nakshatra: ${panchang.nakshatra}`,
      `⛔ Rahu Kaal: ${panchang.rahuKaal}`,
      `🎨 Shubh Rang: ${panchang.shubhRang}`,
      `🔢 Shubh Ank: ${panchang.shubhAnk}`,
    ];
    if (panchang.dayDeity) {
      lines.push(`🙏 Aaj Ka Devta: ${panchang.dayDeity.deity} — ${panchang.dayDeity.name}`);
    }
    if (panchang.ritu) {
      lines.push(`🌿 Ritu: ${panchang.ritu.name} (${panchang.ritu.english})`);
    }
    lines.push('', `Aaj ka panchang: ${typeof window !== 'undefined' ? window.location.href : ''}`);
    return lines.join('\n');
  }

  function handleCopyShare() {
    const text = buildShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  const panchangSections = panchang
    ? [
        { icon: '📅', label: 'Tithi', content: panchang.tithi },
        { icon: '⭐', label: 'Nakshatra', content: panchang.nakshatra },
        { icon: '⛔', label: 'Rahu Kaal', content: panchang.rahuKaal },
        { icon: '🎨', label: 'Shubh Rang', content: panchang.shubhRang },
        { icon: '🔢', label: 'Shubh Ank', content: String(panchang.shubhAnk) },
        {
          icon: '🙏',
          label: 'Aaj Ka Devta',
          content: panchang.dayDeity
            ? `${panchang.dayDeity.deity} — ${panchang.dayDeity.name}`
            : '—',
        },
        {
          icon: '🌿',
          label: 'Ritu',
          content: panchang.ritu
            ? `${panchang.ritu.name} (${panchang.ritu.english})`
            : '—',
        },
      ]
    : [];

  return (
    <ToolPageLayout
      title="Aaj Ka Panchang"
      subtitle="Aaj ka shubh muhurat, tithi, aur nakshatra"
    >
      {/* ---- Panchang Section ---- */}
      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>Aaj Ka Divya Panchang</h2>

        {panchangPhase === 'loading' && (
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner} aria-hidden="true">ॐ</div>
            <p style={styles.loadingText}>Aaj ka panchang nikala ja raha hai...</p>
          </div>
        )}

        {panchangPhase === 'error' && (
          <div style={styles.errorBox} role="alert">
            {panchangError}
          </div>
        )}

        {panchangPhase === 'result' && panchang && (
          <div className="fade-in">
            <ToolResultCard sections={panchangSections} />

            <button
              onClick={handleCopyShare}
              style={styles.copyShareBtn}
              title="Copy panchang text to share in WhatsApp group"
            >
              WhatsApp group mein share karein
            </button>

            <LeadCaptureForm
              toolName="panchang"
              metadata={{ date: new Date().toISOString() }}
            />
          </div>
        )}
      </section>

      {/* ---- Divider ---- */}
      <div style={styles.divider} aria-hidden="true" />

      {/* ---- Muhurat Advisor Section ---- */}
      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>Muhurat Puchho</h2>
        <p style={styles.sectionSubtext}>
          Aaj ke liye shubh samay jaanein apne kaam ke hisaab se
        </p>

        {(muhuratPhase === 'input' || muhuratPhase === 'error') && (
          <form onSubmit={handleMuhuratSubmit} style={styles.form} noValidate>
            <label htmlFor="muhurat-input" style={styles.inputLabel}>
              Aaj kya karna chahte hain? (shadi, safar, vyapar...)
            </label>
            <input
              id="muhurat-input"
              type="text"
              value={muhuratQuery}
              onChange={(e) => setMuhuratQuery(e.target.value)}
              placeholder="jaise ki: naya vyapar shuru karna, safar par jaana..."
              style={styles.textInput}
              autoComplete="off"
              maxLength={200}
            />
            {muhuratPhase === 'error' && (
              <div style={styles.errorBox} role="alert">
                {muhuratError}
              </div>
            )}
            <button
              type="submit"
              disabled={!muhuratQuery.trim()}
              style={{
                ...styles.submitBtn,
                ...(!muhuratQuery.trim() ? styles.submitBtnDisabled : {}),
              }}
            >
              Shubh Muhurat Jaanein
            </button>
          </form>
        )}

        {muhuratPhase === 'loading' && (
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner} aria-hidden="true">ॐ</div>
            <p style={styles.loadingText}>Shubh muhurat dhundha ja raha hai...</p>
          </div>
        )}

        {muhuratPhase === 'result' && muhuratResult && (
          <div className="fade-in">
            <div style={styles.muhuratResultBox}>
              <p style={styles.muhuratResultText}>{muhuratResult}</p>
            </div>
            <button
              onClick={() => {
                setMuhuratPhase('input');
                setMuhuratQuery('');
                setMuhuratResult('');
              }}
              style={styles.tryAnotherBtn}
            >
              Doosra muhurat puchho
            </button>
          </div>
        )}
      </section>
    </ToolPageLayout>
  );
}

/* ---- Styles ---- */
const FONT_DEVANAGARI =
  '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif';

const styles = {
  section: {
    marginBottom: '0.5rem',
  },
  sectionHeading: {
    fontFamily:
      '"Yatra One", "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", serif',
    fontSize: 'clamp(1.3rem, 3vw, 1.75rem)',
    color: '#FFD700',
    marginBottom: '0.5rem',
    lineHeight: 1.3,
  },
  sectionSubtext: {
    fontSize: '0.9rem',
    color: '#9E8A6F',
    marginBottom: '1.25rem',
    fontFamily: FONT_DEVANAGARI,
  },
  divider: {
    height: '1px',
    background: 'rgba(255,153,51,0.18)',
    margin: '2rem 0',
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
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    color: '#FCA5A5',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    fontFamily: FONT_DEVANAGARI,
    marginBottom: '1rem',
  },

  /* Copy/Share button */
  copyShareBtn: {
    display: 'block',
    width: '100%',
    marginTop: '1.25rem',
    marginBottom: '1.5rem',
    padding: '0.85rem 1rem',
    background: 'linear-gradient(135deg, rgba(255,107,33,0.15), rgba(255,153,51,0.12))',
    border: '1px solid rgba(255,153,51,0.4)',
    borderRadius: '12px',
    color: '#FF9933',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: FONT_DEVANAGARI,
    textAlign: 'center',
    transition: 'background 150ms ease',
  },

  /* Muhurat form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxWidth: '440px',
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
    fontSize: '1rem',
    color: '#F5ECD7',
    outline: 'none',
    fontFamily: FONT_DEVANAGARI,
    width: '100%',
    transition: 'border-color 150ms ease',
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

  /* Muhurat result */
  muhuratResultBox: {
    background: 'rgba(255,215,0,0.07)',
    border: '1px solid rgba(255,215,0,0.25)',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
  },
  muhuratResultText: {
    fontSize: '1rem',
    color: '#F5ECD7',
    lineHeight: 1.75,
    fontFamily: FONT_DEVANAGARI,
    whiteSpace: 'pre-wrap',
    margin: 0,
  },

  /* Try another */
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
