'use client';

import { useState, useEffect } from 'react';
import ToolResultCard from '@/components/tools/ToolResultCard';
import LeadCaptureForm from '@/components/tools/LeadCaptureForm';
import ShareButton from '@/components/tools/ShareButton';

/**
 * Swapna Phal — /swapna-phal
 *
 * Dark/mystical dream interpreter. Does NOT use ToolPageLayout — owns its own
 * deep-indigo layout with starfield background to match the dream theme.
 */
export default function SwapnaPhalPage() {
  const [userName, setUserName] = useState('');
  const [dreamText, setDreamText] = useState('');
  const [phase, setPhase] = useState('input'); // 'input' | 'loading' | 'result' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const DREAM_MAX = 1000;
  const DREAM_MIN = 10;
  const charsLeft = DREAM_MAX - dreamText.length;
  const isValid =
    userName.trim().length > 0 &&
    dreamText.trim().length >= DREAM_MIN &&
    dreamText.length <= DREAM_MAX;

  useEffect(() => {
    document.title = 'Swapna Phal — Apne Sapne Ka Arth Jaanein | Bhakti Daily';
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;

    setPhase('loading');
    setErrorMsg('');
    setResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/tools/dream-interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamDescription: dreamText.trim(),
          userName: userName.trim(),
        }),
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
          : 'Sapne ka arth nahi mila. Phir se koshish karein.',
      );
      setPhase('error');
    }
  }

  function handleReset() {
    setPhase('input');
    setUserName('');
    setDreamText('');
    setResult(null);
    setErrorMsg('');
  }

  function buildShareText() {
    if (!result) return '';
    return (
      `🌙 Mera Swapna Phal\n\n` +
      `🔮 Arth: ${result.interpretation}\n\n` +
      `📖 Shastra Sandarbh: ${result.reference}\n\n` +
      `🙏 Sujhaav: ${result.suggestion}\n\n` +
      `Apna sapna jaanein: ${typeof window !== 'undefined' ? window.location.href : ''}`
    );
  }

  function buildWhatsAppLink() {
    const text = buildShareText();
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  const resultSections = result
    ? [
        { icon: '🔮', label: 'Swapna Ka Arth', content: result.interpretation },
        { icon: '📖', label: 'Shastra Sandarbh', content: result.reference },
        { icon: '🙏', label: 'Sujhaav', content: result.suggestion },
      ]
    : [];

  return (
    <div style={styles.page}>
      {/* Starfield layer */}
      <div style={styles.starfield} aria-hidden="true" />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.moonWrapper} aria-hidden="true">
            <span style={styles.moonEmoji}>🌙</span>
          </div>
          <h1 style={styles.title}>Swapna Phal</h1>
          <p style={styles.subtitle}>Apne sapne ka divya arth shastra ke anusar jaanein</p>
        </div>
      </header>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.content}>
          {/* ---- Input phase ---- */}
          {(phase === 'input' || phase === 'error') && (
            <form onSubmit={handleSubmit} style={styles.form} noValidate>
              {/* Name */}
              <div style={styles.fieldGroup}>
                <label htmlFor="dream-name" style={styles.inputLabel}>
                  Aapka naam
                </label>
                <input
                  id="dream-name"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="jaise ki: Priya, Rahul..."
                  style={styles.textInput}
                  maxLength={50}
                  autoComplete="given-name"
                />
              </div>

              {/* Dream textarea */}
              <div style={styles.fieldGroup}>
                <label htmlFor="dream-text" style={styles.inputLabel}>
                  Aaj raat aapne kya sapna dekha? Vistaar se likhein...
                </label>
                <textarea
                  id="dream-text"
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="Sapne mein kya hua, kaun tha, kya dekha — sab likhein..."
                  style={styles.textarea}
                  maxLength={DREAM_MAX}
                  rows={5}
                />
                <div style={styles.charCount}>
                  <span
                    style={{
                      ...styles.charCountText,
                      ...(charsLeft < 50 ? styles.charCountWarning : {}),
                    }}
                  >
                    {dreamText.length}/{DREAM_MAX}
                  </span>
                  {dreamText.length > 0 && dreamText.trim().length < DREAM_MIN && (
                    <span style={styles.minHint}>
                      Kam se kam {DREAM_MIN} akshar likhein
                    </span>
                  )}
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
                Swapna Phal Jaanein 🌙
              </button>
            </form>
          )}

          {/* ---- Loading phase ---- */}
          {phase === 'loading' && (
            <div style={styles.loadingWrapper}>
              <div style={styles.moonSpinner} aria-hidden="true">🌙</div>
              <p style={styles.loadingText}>
                Shastra mein aapke sapne ka arth dhundha ja raha hai...
              </p>
              <p style={styles.loadingSubtext}>Kuch pal ki prateeksha karein...</p>
            </div>
          )}

          {/* ---- Result phase ---- */}
          {phase === 'result' && result && (
            <div className="fade-in">
              <p style={styles.resultIntro}>
                <span style={styles.resultName}>{userName.trim()}</span>, aapke sapne ka arth:
              </p>

              {/* Dark-themed result cards */}
              <div style={styles.darkResultCard}>
                {resultSections.map((section, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.darkSection,
                      ...(idx < resultSections.length - 1
                        ? styles.darkSectionBorder
                        : {}),
                    }}
                  >
                    <div style={styles.darkSectionHeader}>
                      <span style={styles.darkIcon} aria-hidden="true">
                        {section.icon}
                      </span>
                      <span style={styles.darkLabel}>{section.label}</span>
                    </div>
                    <p style={styles.darkContent}>{section.content}</p>
                  </div>
                ))}
              </div>

              {/* Share actions */}
              <ShareButton
                text={buildShareText()}
                url={typeof window !== 'undefined' ? window.location.href : ''}
              />

              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.whatsappBtn}
              >
                WhatsApp pe bhejo
              </a>

              <LeadCaptureForm
                toolName="dream"
                metadata={{ userName: userName.trim() }}
              />

              <div style={styles.tryAnotherWrapper}>
                <button onClick={handleReset} style={styles.tryAnotherBtn}>
                  Doosra sapna jaanein
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>Daily Divine — Roz Ka Divya Sandesh</span>
      </footer>
    </div>
  );
}

/* ---- Styles ---- */
const FONT_DEVANAGARI =
  '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif';

const styles = {
  /* Page wrapper — deep indigo */
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a3e',
    fontFamily: FONT_DEVANAGARI,
    color: '#E8E0FF',
    position: 'relative',
    overflow: 'hidden',
  },

  /* Starfield — CSS radial-gradient dots */
  starfield: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    background:
      'radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.55) 0%, transparent 100%),' +
      'radial-gradient(1px 1px at 25% 60%, rgba(255,255,255,0.45) 0%, transparent 100%),' +
      'radial-gradient(1.5px 1.5px at 40% 30%, rgba(255,255,255,0.6) 0%, transparent 100%),' +
      'radial-gradient(1px 1px at 55% 80%, rgba(255,255,255,0.5) 0%, transparent 100%),' +
      'radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.4) 0%, transparent 100%),' +
      'radial-gradient(1.5px 1.5px at 80% 55%, rgba(255,255,255,0.55) 0%, transparent 100%),' +
      'radial-gradient(1px 1px at 90% 10%, rgba(255,255,255,0.5) 0%, transparent 100%),' +
      'radial-gradient(1px 1px at 15% 90%, rgba(255,255,255,0.35) 0%, transparent 100%),' +
      'radial-gradient(2px 2px at 60% 45%, rgba(200,180,255,0.4) 0%, transparent 100%),' +
      'radial-gradient(1px 1px at 35% 70%, rgba(255,255,255,0.45) 0%, transparent 100%),' +
      'radial-gradient(1px 1px at 48% 10%, rgba(255,255,255,0.5) 0%, transparent 100%),' +
      'radial-gradient(1.5px 1.5px at 75% 85%, rgba(200,160,255,0.5) 0%, transparent 100%)',
    pointerEvents: 'none',
  },

  /* Header */
  header: {
    position: 'relative',
    zIndex: 1,
    background:
      'linear-gradient(135deg, rgba(80,40,160,0.4) 0%, rgba(40,20,100,0.3) 100%)',
    borderBottom: '1px solid rgba(160,120,255,0.25)',
    padding: '2.5rem 1.5rem 2rem',
    textAlign: 'center',
  },
  headerInner: {
    maxWidth: '680px',
    margin: '0 auto',
  },
  moonWrapper: {
    marginBottom: '0.75rem',
  },
  moonEmoji: {
    fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
    display: 'inline-block',
    lineHeight: 1,
    filter: 'drop-shadow(0 0 12px rgba(200,180,255,0.6))',
  },
  title: {
    fontFamily:
      '"Yatra One", "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", serif',
    fontSize: 'clamp(1.75rem, 4vw, 2.6rem)',
    color: '#D4BBFF',
    marginBottom: '0.5rem',
    lineHeight: 1.2,
    textShadow: '0 0 30px rgba(180,140,255,0.5)',
  },
  subtitle: {
    fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
    color: '#9E8AC8',
    lineHeight: 1.6,
  },

  /* Main */
  main: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    padding: '2.5rem 1.5rem',
  },
  content: {
    maxWidth: '680px',
    margin: '0 auto',
  },

  /* Form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    maxWidth: '480px',
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
    color: '#A98FD4',
    fontFamily: FONT_DEVANAGARI,
  },
  textInput: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(160,120,255,0.35)',
    borderRadius: '12px',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    color: '#E8E0FF',
    outline: 'none',
    fontFamily: FONT_DEVANAGARI,
    width: '100%',
    transition: 'border-color 150ms ease',
  },
  textarea: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(160,120,255,0.35)',
    borderRadius: '12px',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    color: '#E8E0FF',
    outline: 'none',
    fontFamily: FONT_DEVANAGARI,
    width: '100%',
    resize: 'vertical',
    lineHeight: 1.6,
    transition: 'border-color 150ms ease',
  },
  charCount: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCountText: {
    fontSize: '0.75rem',
    color: '#7A6E9A',
    fontFamily: FONT_DEVANAGARI,
  },
  charCountWarning: {
    color: '#F9A8D4',
  },
  minHint: {
    fontSize: '0.75rem',
    color: '#F9A8D4',
    fontFamily: FONT_DEVANAGARI,
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
    background: 'linear-gradient(135deg, #6B3FCC, #9B6BF0)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
    fontFamily: FONT_DEVANAGARI,
    boxShadow: '0 4px 20px rgba(107,63,204,0.4)',
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
  moonSpinner: {
    fontSize: '3.5rem',
    display: 'inline-block',
    animation: 'spin 3s ease-in-out infinite',
    filter: 'drop-shadow(0 0 16px rgba(180,140,255,0.7))',
  },
  loadingText: {
    fontSize: '1rem',
    color: '#A98FD4',
    textAlign: 'center',
    fontFamily: FONT_DEVANAGARI,
  },
  loadingSubtext: {
    fontSize: '0.85rem',
    color: '#6B5F8A',
    textAlign: 'center',
    fontFamily: FONT_DEVANAGARI,
  },

  /* Result — dark-themed cards */
  resultIntro: {
    fontSize: '1.05rem',
    color: '#A98FD4',
    marginBottom: '1.25rem',
    fontFamily: FONT_DEVANAGARI,
  },
  resultName: {
    color: '#D4BBFF',
    fontWeight: 700,
  },
  darkResultCard: {
    background: 'linear-gradient(145deg, rgba(40,20,90,0.9) 0%, rgba(25,15,60,0.95) 100%)',
    border: '1.5px solid rgba(140,100,220,0.4)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow:
      '0 4px 24px rgba(100,60,200,0.25), 0 1px 4px rgba(0,0,0,0.5)',
    marginBottom: '1.5rem',
    animation: 'fadeIn 0.45s ease both',
  },
  darkSection: {
    padding: '1.25rem 1.5rem',
  },
  darkSectionBorder: {
    borderBottom: '1px solid rgba(120,80,200,0.2)',
  },
  darkSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  darkIcon: {
    fontSize: '1.2rem',
    lineHeight: 1,
  },
  darkLabel: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#9B6BF0',
    fontFamily: FONT_DEVANAGARI,
  },
  darkContent: {
    fontSize: '1rem',
    color: '#D4BBFF',
    lineHeight: 1.75,
    fontFamily: FONT_DEVANAGARI,
    margin: 0,
  },

  /* WhatsApp link */
  whatsappBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '0.85rem 1rem',
    background: 'linear-gradient(135deg, rgba(37,211,102,0.15), rgba(37,211,102,0.1))',
    border: '1px solid rgba(37,211,102,0.35)',
    borderRadius: '12px',
    color: '#4ADE80',
    fontSize: '1rem',
    fontWeight: 700,
    textDecoration: 'none',
    marginBottom: '1.25rem',
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
    border: '1px solid rgba(140,100,220,0.3)',
    color: '#6B5F8A',
    borderRadius: '10px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontFamily: FONT_DEVANAGARI,
    transition: 'color 150ms ease, border-color 150ms ease',
  },

  /* Footer */
  footer: {
    position: 'relative',
    zIndex: 1,
    padding: '1.25rem 1.5rem',
    textAlign: 'center',
    borderTop: '1px solid rgba(140,100,220,0.12)',
    background: 'rgba(0,0,0,0.3)',
  },
  footerText: {
    fontSize: '0.8rem',
    color: '#4A3F6A',
    letterSpacing: '0.04em',
  },
};
