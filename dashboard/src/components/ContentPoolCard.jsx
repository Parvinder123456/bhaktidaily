'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * ContentPoolCard — S1-T6
 *
 * Displays AI-generated content pool stats for the three pool types:
 * trivia, facts, and hanuman chaupais.
 *
 * Wired to: GET /api/admin/content/pool-levels
 * Response shape: { trivia, facts, chaupais } where each is { unused, total, lastGenerated }
 */
export default function ContentPoolCard() {
  const [levels, setLevels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getContentPoolLevels()
      .then(setLevels)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Content Pool</span>
        <span style={styles.icon}>📚</span>
      </div>

      {loading && <p style={styles.muted}>Loading pool stats…</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {levels && (
        <div style={styles.poolList}>
          <PoolRow
            label="Trivia"
            emoji="🧩"
            data={levels.trivia}
          />
          <div style={styles.divider} />
          <PoolRow
            label="Facts"
            emoji="📜"
            data={levels.facts}
          />
          <div style={styles.divider} />
          <PoolRow
            label="Hanuman Chaupai"
            emoji="🙏"
            data={levels.chaupais}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single pool row with fill gauge
// ---------------------------------------------------------------------------

function PoolRow({ label, emoji, data }) {
  if (!data) return null;

  const { unused, total, lastGenerated } = data;
  const used = total - unused;
  const fillPct = total > 0 ? Math.round((unused / total) * 100) : 0;

  // Colour the gauge: red < 20%, amber < 50%, green >= 50%
  let gaugeColor;
  if (fillPct < 20) {
    gaugeColor = 'var(--color-error)';
  } else if (fillPct < 50) {
    gaugeColor = 'var(--color-saffron)';
  } else {
    gaugeColor = 'var(--color-success)';
  }

  const lastGenLabel = lastGenerated
    ? new Date(lastGenerated).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : 'Never';

  return (
    <div style={styles.poolRow}>
      <div style={styles.rowTop}>
        <span style={styles.rowLabel}>
          {emoji} {label}
        </span>
        <span style={styles.rowCounts}>
          <span style={{ color: gaugeColor, fontWeight: 600 }}>{unused}</span>
          <span style={styles.muted}> / {total} fresh</span>
        </span>
      </div>

      {/* Fill gauge */}
      <div style={styles.gaugeTrack}>
        <div
          style={{
            ...styles.gaugeFill,
            width: `${fillPct}%`,
            background: gaugeColor,
          }}
        />
      </div>

      <div style={styles.rowMeta}>
        <span style={styles.metaText}>{used} used</span>
        <span style={styles.metaText}>Last gen: {lastGenLabel}</span>
      </div>
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
  poolList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  divider: {
    borderTop: '1px solid var(--color-border)',
    margin: '0.875rem 0',
  },
  poolRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  },
  rowCounts: {
    fontSize: '0.85rem',
  },
  gaugeTrack: {
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.6s ease',
  },
  rowMeta: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
};
