'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * ABTestingCard — S4-T5
 *
 * Shows A/B test performance for prompt variants (bhagwan_sandesh by default).
 * The winning variant is highlighted. Displays reply rates and user counts.
 *
 * Wired to: GET /api/admin/variants/performance?featureKey=bhagwan_sandesh
 * Response shape:
 *   {
 *     variants: Array<{ id, style, lastReplyRate, userCount, isWinner }>,
 *     lastRotation: ISO string | null,
 *     usersMoved: number,
 *   }
 */
export default function ABTestingCard({ featureKey = 'bhagwan_sandesh' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getVariantPerformance(featureKey)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [featureKey]);

  const variants = data?.variants || [];
  const hasData = variants.length > 0;
  const winner = variants.find((v) => v.isWinner);

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <span style={styles.sectionLabel}>A/B Testing</span>
          <p style={styles.featureKeyLabel}>{featureKey}</p>
        </div>
        <span style={styles.icon}>🧪</span>
      </div>

      {loading && <p style={styles.muted}>Loading variant data…</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {!loading && !error && !hasData && (
        <p style={styles.muted}>No active variants found. Run seedVariants.js first.</p>
      )}

      {hasData && (
        <>
          {/* Winner callout */}
          {winner && (
            <div style={styles.winnerBanner}>
              <span style={styles.winnerCrown}>👑</span>
              <span style={styles.winnerText}>
                <strong style={{ color: 'var(--color-gold)' }}>{formatStyle(winner.style)}</strong> is winning
                at <strong style={{ color: 'var(--color-gold)' }}>{fmtRate(winner.lastReplyRate)}</strong> reply rate
              </span>
            </div>
          )}

          {/* Variant rows */}
          <div style={styles.variantList}>
            {variants.map((v) => (
              <VariantRow key={v.id} variant={v} maxRate={variants[0].lastReplyRate} />
            ))}
          </div>

          {/* Footer meta */}
          <div style={styles.footer}>
            {data.lastRotation ? (
              <span style={styles.metaText}>
                Last rotation: {new Date(data.lastRotation).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  timeZone: 'Asia/Kolkata',
                })}
              </span>
            ) : (
              <span style={styles.metaText}>No rotation yet</span>
            )}
            {data.usersMoved > 0 && (
              <span style={styles.movedBadge}>
                {data.usersMoved} users moved
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: one variant row with fill bar
// ---------------------------------------------------------------------------

function VariantRow({ variant, maxRate }) {
  const { style, lastReplyRate, userCount, isWinner } = variant;
  const fillPct = maxRate > 0 ? (lastReplyRate / maxRate) * 100 : 0;
  const hasRateData = lastReplyRate > 0;

  return (
    <div
      style={{
        ...styles.variantRow,
        ...(isWinner ? styles.variantRowWinner : {}),
      }}
    >
      <div style={styles.variantTop}>
        <div style={styles.variantName}>
          {isWinner && <span style={styles.winnerStar}>★ </span>}
          <span style={{ ...styles.variantStyle, color: isWinner ? 'var(--color-gold)' : 'var(--color-text-primary)' }}>
            {formatStyle(style)}
          </span>
        </div>
        <div style={styles.variantStats}>
          <span
            style={{
              ...styles.replyRate,
              color: hasRateData
                ? (isWinner ? 'var(--color-gold)' : 'var(--color-saffron)')
                : 'var(--color-text-muted)',
            }}
          >
            {hasRateData ? fmtRate(lastReplyRate) : 'No data'}
          </span>
          <span style={styles.userCount}>{userCount} users</span>
        </div>
      </div>

      {/* Rate bar — only shown when there is rate data */}
      {hasRateData && (
        <div style={styles.rateTrack}>
          <div
            style={{
              ...styles.rateFill,
              width: `${fillPct}%`,
              background: isWinner ? 'var(--color-gold)' : 'rgba(255, 153, 51, 0.5)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStyle(style) {
  if (!style) return 'Unknown';
  return style.charAt(0).toUpperCase() + style.slice(1);
}

function fmtRate(rate) {
  return `${Math.round((rate || 0) * 100)}%`;
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
    alignItems: 'flex-start',
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
  featureKeyLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-saffron)',
    marginTop: '0.125rem',
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
  winnerBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 215, 0, 0.08)',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    marginBottom: '1rem',
  },
  winnerCrown: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  winnerText: {
    fontSize: '0.83rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1.4,
  },
  variantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
    marginBottom: '1rem',
  },
  variantRow: {
    padding: '0.625rem 0.75rem',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  variantRowWinner: {
    background: 'rgba(255, 215, 0, 0.05)',
    border: '1px solid rgba(255, 215, 0, 0.25)',
  },
  variantTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  variantName: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.1rem',
  },
  winnerStar: {
    color: 'var(--color-gold)',
    fontSize: '0.85rem',
  },
  variantStyle: {
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  variantStats: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  replyRate: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.1rem',
    lineHeight: 1,
  },
  userCount: {
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
  },
  rateTrack: {
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '0.75rem',
  },
  metaText: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  movedBadge: {
    fontSize: '0.73rem',
    color: 'var(--color-saffron)',
    border: '1px solid rgba(255,153,51,0.3)',
    borderRadius: '10px',
    padding: '0.15rem 0.5rem',
  },
};
