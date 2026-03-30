'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * PromptVariationCard — S2-T5
 *
 * Displays today's active raashifal lens and A/B variant snapshot at a glance.
 * This card is intentionally lightweight — full A/B detail lives in ABTestingCard.
 *
 * Wired to: GET /api/admin/prompt/today
 * Response shape: { lens: { key, label, description }, scenarioSampleSize, activeUserCount }
 */
export default function PromptVariationCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPromptToday()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Today&apos;s Prompt</span>
        <span style={styles.icon}>🔮</span>
      </div>

      {loading && <p style={styles.muted}>Loading prompt data…</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {data && (
        <>
          {/* Active lens */}
          <div style={styles.lensBlock}>
            <p style={styles.lensLabel}>Active Lens</p>
            <div style={styles.lensChip}>
              <span style={styles.lensKey}>{data.lens?.key}</span>
              <span style={styles.lensDot} />
              <span style={styles.lensLabelText}>{data.lens?.label}</span>
            </div>
            {data.lens?.description && (
              <p style={styles.lensDesc}>{data.lens.description}</p>
            )}
          </div>

          <div style={styles.divider} />

          {/* Stats row */}
          <div style={styles.statsRow}>
            <StatBox
              label="Active Users"
              value={data.activeUserCount ?? '—'}
              color="var(--color-gold)"
            />
            <StatBox
              label="Scenario Pool"
              value={data.scenarioSampleSize ?? '—'}
              color="var(--color-saffron)"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: small stat box
// ---------------------------------------------------------------------------

function StatBox({ label, value, color }) {
  return (
    <div style={styles.statBox}>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  card: {
    minWidth: '240px',
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
  lensBlock: {
    marginBottom: '0.25rem',
  },
  lensLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  lensChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 153, 51, 0.1)',
    border: '1px solid rgba(255, 153, 51, 0.25)',
    borderRadius: '20px',
    padding: '0.3rem 0.875rem',
    marginBottom: '0.625rem',
  },
  lensKey: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--color-saffron)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  lensDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'var(--color-text-muted)',
  },
  lensLabelText: {
    fontSize: '0.85rem',
    color: 'var(--color-text-primary)',
  },
  lensDesc: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
    fontStyle: 'italic',
  },
  divider: {
    borderTop: '1px solid var(--color-border)',
    margin: '1rem 0',
  },
  statsRow: {
    display: 'flex',
    gap: '1rem',
  },
  statBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '0.625rem 0.5rem',
    border: '1px solid var(--color-border)',
  },
  statValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.75rem',
    lineHeight: 1,
    marginBottom: '0.25rem',
  },
  statLabel: {
    fontSize: '0.73rem',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};
