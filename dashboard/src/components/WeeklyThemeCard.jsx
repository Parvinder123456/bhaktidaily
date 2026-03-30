'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * WeeklyThemeCard — S4-T5
 *
 * Displays the current week in the 12-week Shraddha-to-Moksha narrative arc.
 * Shows: Sanskrit theme name, English translation, today's arc beat, teaching,
 * cycle progress indicator, and arc beat instruction.
 *
 * Wired to: GET /api/admin/theme/current
 * Response shape:
 *   {
 *     themeSanskrit: string,    // e.g. "Shraddha"
 *     themeEnglish: string,     // e.g. "Faith"
 *     teaching: string,         // ~2 sentences in Hindi
 *     arcBeat: string,          // e.g. "Introduce theme gently"
 *     arcInstruction: string,   // prompt injection text
 *     cycleWeek: number,        // 1–12
 *     cycle: number,            // which run of the 12-week cycle (1+)
 *   }
 */
export default function WeeklyThemeCard() {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCurrentTheme()
      .then(setTheme)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Weekly Theme</span>
        <span style={styles.icon}>🕉️</span>
      </div>

      {loading && <p style={styles.muted}>Loading theme…</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {theme && (
        <>
          {/* Cycle progress */}
          <CycleProgress cycleWeek={theme.cycleWeek} cycle={theme.cycle} />

          {/* Theme name block */}
          <div style={styles.themeBlock}>
            <h2 style={styles.themeSanskrit}>{theme.themeSanskrit}</h2>
            <p style={styles.themeEnglish}>{theme.themeEnglish}</p>
          </div>

          {/* Teaching */}
          <blockquote style={styles.teachingQuote}>
            <p style={styles.teachingText}>{theme.teaching}</p>
          </blockquote>

          <div style={styles.divider} />

          {/* Today's arc beat */}
          <div style={styles.arcBlock}>
            <p style={styles.arcLabel}>Today&apos;s Arc Beat</p>
            <p style={styles.arcBeat}>{theme.arcBeat}</p>
            {theme.arcInstruction && (
              <p style={styles.arcInstruction}>{theme.arcInstruction}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: 12-dot progress indicator for the cycle
// ---------------------------------------------------------------------------

function CycleProgress({ cycleWeek, cycle }) {
  const TOTAL = 12;
  const currentIdx = Math.max(0, Math.min(cycleWeek - 1, TOTAL - 1));

  return (
    <div style={styles.cycleRow}>
      <div style={styles.dotRow}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              ...(i < currentIdx
                ? styles.dotDone
                : i === currentIdx
                  ? styles.dotCurrent
                  : styles.dotFuture),
            }}
            title={`Week ${i + 1}`}
          />
        ))}
      </div>
      <span style={styles.cycleLabel}>
        Week {cycleWeek} / 12
        {cycle > 1 && (
          <span style={styles.cycleRun}> — Cycle {cycle}</span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  card: {
    minWidth: '280px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
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
  muted: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
  },
  errorText: {
    fontSize: '0.85rem',
    color: 'var(--color-error)',
  },

  // Cycle progress
  cycleRow: {
    marginBottom: '1.125rem',
  },
  dotRow: {
    display: 'flex',
    gap: '5px',
    marginBottom: '0.4rem',
    flexWrap: 'wrap',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'background 0.3s ease',
  },
  dotDone: {
    background: 'rgba(255, 215, 0, 0.4)',
  },
  dotCurrent: {
    background: 'var(--color-gold)',
    boxShadow: '0 0 6px rgba(255,215,0,0.6)',
  },
  dotFuture: {
    background: 'rgba(255,255,255,0.1)',
  },
  cycleLabel: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
  },
  cycleRun: {
    color: 'var(--color-saffron)',
  },

  // Theme name
  themeBlock: {
    marginBottom: '1rem',
  },
  themeSanskrit: {
    fontFamily: 'var(--font-heading)',
    fontSize: '2.25rem',
    color: 'var(--color-gold)',
    lineHeight: 1.1,
    marginBottom: '0.2rem',
  },
  themeEnglish: {
    fontSize: '1rem',
    color: 'var(--color-saffron)',
    fontWeight: 500,
  },

  // Teaching quote
  teachingQuote: {
    borderLeft: '3px solid var(--color-saffron)',
    paddingLeft: '1rem',
    marginBottom: '1rem',
  },
  teachingText: {
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
    fontStyle: 'italic',
  },

  divider: {
    borderTop: '1px solid var(--color-border)',
    margin: '0.875rem 0',
  },

  // Arc beat
  arcBlock: {
    background: 'rgba(255,153,51,0.05)',
    border: '1px solid rgba(255,153,51,0.15)',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  arcLabel: {
    fontSize: '0.73rem',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.375rem',
  },
  arcBeat: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--color-saffron)',
    marginBottom: '0.375rem',
  },
  arcInstruction: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
  },
};
