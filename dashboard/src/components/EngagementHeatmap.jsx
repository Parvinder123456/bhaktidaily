'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * EngagementHeatmap — S3-T5
 *
 * Visualises the distribution of users across engagement tiers (high/medium/low).
 * Shows count per tier, percentage bar, and tier descriptions.
 *
 * Wired to: GET /api/admin/engagement/distribution
 * Response shape: { high: number, medium: number, low: number, total: number }
 *
 * Tier thresholds (from engagementService.js):
 *   high   >= 30% reply rate
 *   medium >= 10% reply rate
 *   low    <  10% reply rate
 */
export default function EngagementHeatmap() {
  const [dist, setDist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getEngagementDistribution()
      .then(setDist)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const total = dist?.total || 0;

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Engagement Tiers</span>
        <span style={styles.icon}>📊</span>
      </div>

      {loading && <p style={styles.muted}>Loading engagement data…</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {dist && (
        <>
          {/* Total pill */}
          <p style={styles.totalLine}>
            <span style={styles.totalCount}>{total}</span>
            <span style={styles.muted}> onboarded users</span>
          </p>

          {/* Stacked bar */}
          {total > 0 && (
            <StackedBar dist={dist} total={total} />
          )}

          <div style={styles.tierList}>
            <TierRow
              tier="high"
              label="High"
              emoji="🔥"
              color="var(--color-success)"
              count={dist.high}
              total={total}
              desc="Replies often — dialog partners"
              threshold="≥ 30% reply rate"
            />
            <TierRow
              tier="medium"
              label="Medium"
              emoji="✨"
              color="var(--color-gold)"
              count={dist.medium}
              total={total}
              desc="Occasional replies — curious"
              threshold="10–30% reply rate"
            />
            <TierRow
              tier="low"
              label="Low"
              emoji="💤"
              color="var(--color-saffron)"
              count={dist.low}
              total={total}
              desc="Passive readers — virality mode"
              threshold="< 10% reply rate"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: stacked bar showing tier split at a glance
// ---------------------------------------------------------------------------

function StackedBar({ dist, total }) {
  const highPct = (dist.high / total) * 100;
  const medPct = (dist.medium / total) * 100;
  const lowPct = (dist.low / total) * 100;

  return (
    <div style={styles.stackedBar}>
      {highPct > 0 && (
        <div
          style={{
            ...styles.barSegment,
            width: `${highPct}%`,
            background: 'var(--color-success)',
            borderRadius: medPct === 0 && lowPct === 0 ? '4px' : '4px 0 0 4px',
          }}
          title={`High: ${dist.high} users`}
        />
      )}
      {medPct > 0 && (
        <div
          style={{
            ...styles.barSegment,
            width: `${medPct}%`,
            background: 'var(--color-gold)',
            borderRadius: highPct === 0 && lowPct === 0 ? '4px' : '0',
          }}
          title={`Medium: ${dist.medium} users`}
        />
      )}
      {lowPct > 0 && (
        <div
          style={{
            ...styles.barSegment,
            width: `${lowPct}%`,
            background: 'var(--color-saffron)',
            borderRadius: highPct === 0 && medPct === 0 ? '4px' : '0 4px 4px 0',
          }}
          title={`Low: ${dist.low} users`}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: one tier row
// ---------------------------------------------------------------------------

function TierRow({ label, emoji, color, count, total, threshold }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div style={styles.tierRow}>
      <div style={styles.tierLeft}>
        <span style={styles.tierEmoji}>{emoji}</span>
        <div>
          <span style={{ ...styles.tierLabel, color }}>{label}</span>
          <p style={styles.tierThreshold}>{threshold}</p>
        </div>
      </div>
      <div style={styles.tierRight}>
        <span style={{ ...styles.tierCount, color }}>{count}</span>
        <span style={styles.tierPct}>{pct}%</span>
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
  totalLine: {
    marginBottom: '0.875rem',
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.25rem',
  },
  totalCount: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.6rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1,
  },
  stackedBar: {
    display: 'flex',
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '1.25rem',
    background: 'rgba(255,255,255,0.06)',
  },
  barSegment: {
    height: '100%',
    transition: 'width 0.6s ease',
  },
  tierList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  tierRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.625rem',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  },
  tierLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  tierEmoji: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  tierLabel: {
    fontSize: '0.9rem',
    fontWeight: 600,
    display: 'block',
    lineHeight: 1.2,
  },
  tierThreshold: {
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.1rem',
  },
  tierRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  tierCount: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.4rem',
    lineHeight: 1,
  },
  tierPct: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
};
