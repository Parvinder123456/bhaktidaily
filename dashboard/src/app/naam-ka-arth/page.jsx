'use client';

import { useState, useEffect } from 'react';
import ToolPageLayout from '@/components/tools/ToolPageLayout';
import ToolResultCard from '@/components/tools/ToolResultCard';
import LeadCaptureForm from '@/components/tools/LeadCaptureForm';
import ShareButton from '@/components/tools/ShareButton';

/**
 * Naam Ka Rahasya — /naam-ka-arth
 *
 * Viral lead-gen tool: enter your Hindu name, get Sanskrit meaning,
 * deity association, and blessing — then opt in to Daily Divine on WhatsApp.
 */
export default function NaamKaArthPage() {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('input'); // 'input' | 'loading' | 'result' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Set document title client-side (client component cannot use metadata export)
  useEffect(() => {
    document.title =
      'Naam Ka Rahasya — Apne Naam Ka Arth Jaanein | Daily Divine';
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setPhase('loading');
    setErrorMsg('');
    setResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/tools/name-meaning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
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
          : `Kuch gadbad hui. Phir se koshish karein.`,
      );
      setPhase('error');
    }
  }

  function handleReset() {
    setPhase('input');
    setName('');
    setResult(null);
    setErrorMsg('');
  }

  // Build share text from result
  function buildShareText() {
    if (!result) return '';
    return (
      `🕉️ Mera naam "${name.trim()}" ka arth:\n\n` +
      `📜 Sanskrit Mool: ${result.sanskritRoot}\n` +
      `🙏 Devta: ${result.deityAssociation}\n` +
      `💫 Arth: ${result.meaning}\n` +
      `✨ Aashirvaad: ${result.blessing}\n\n` +
      `Apna naam jaanein: ${typeof window !== 'undefined' ? window.location.href : ''}`
    );
  }

  const resultSections = result
    ? [
        { icon: '📜', label: 'Sanskrit Mool', content: result.sanskritRoot },
        { icon: '🙏', label: 'Devta Sambandh', content: result.deityAssociation },
        { icon: '💫', label: 'Arth', content: result.meaning },
        { icon: '✨', label: 'Aashirvaad', content: result.blessing },
      ]
    : [];

  return (
    <ToolPageLayout
      title="Naam Ka Rahasya 🕉️"
      subtitle="Apne naam mein chhupa divya arth jaanein"
    >
      {/* ---- Input phase ---- */}
      {phase === 'input' && (
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label htmlFor="naam-input" style={styles.inputLabel}>
            Apna naam likhein
          </label>
          <input
            id="naam-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="jaise ki: Arjun, Priya, Kavita..."
            style={styles.textInput}
            autoComplete="off"
            autoFocus
            maxLength={60}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              ...styles.submitBtn,
              ...(!name.trim() ? styles.submitBtnDisabled : {}),
            }}
          >
            Arth Jaanein 🙏
          </button>
        </form>
      )}

      {/* ---- Loading phase ---- */}
      {phase === 'loading' && (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner} aria-hidden="true">ॐ</div>
          <p style={styles.loadingText}>
            Shastra mein aapka naam dhundha ja raha hai...
          </p>
        </div>
      )}

      {/* ---- Error phase ---- */}
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

      {/* ---- Result phase ---- */}
      {phase === 'result' && result && (
        <div className="fade-in">
          {/* Result heading */}
          <p style={styles.resultIntro}>
            <span style={styles.resultName}>"{name.trim()}"</span> ka divya arth:
          </p>

          {/* Result card */}
          <ToolResultCard sections={resultSections} />

          {/* Share buttons */}
          <ShareButton
            text={buildShareText()}
            url={typeof window !== 'undefined' ? window.location.href : ''}
          />

          {/* WhatsApp opt-in */}
          <LeadCaptureForm
            toolName="name_meaning"
            metadata={{ name: name.trim() }}
          />

          {/* Try another name */}
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
  /* Input form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxWidth: '440px',
    margin: '0 auto',
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
  resultName: {
    color: '#FFD700',
    fontWeight: 700,
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
