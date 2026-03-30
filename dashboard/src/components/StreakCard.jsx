'use client';

export default function StreakCard({ streakCount = 0, lastInteraction = null }) {
  const isActive = streakCount > 0;

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Your Streak</span>
      </div>

      <div style={styles.body}>
        <span className={isActive ? 'streak-fire' : ''} style={styles.fireEmoji}>
          🔥
        </span>
        <div style={styles.countArea}>
          <span style={styles.count}>{streakCount}</span>
          <span style={styles.countLabel}>
            {streakCount === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      <p style={styles.streakLine}>
        {isActive
          ? `Day ${streakCount} — keep going! 🙏`
          : 'Start your streak today by interacting with Bhakti Daily.'}
      </p>

      {lastInteraction && (
        <p style={styles.lastSeen}>
          Last interaction:{' '}
          {new Date(lastInteraction).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      )}

      {/* Milestone badges */}
      <div style={styles.milestones}>
        {[7, 21, 40, 108].map((milestone) => (
          <span
            key={milestone}
            style={{
              ...styles.badge,
              ...(streakCount >= milestone ? styles.badgeActive : styles.badgeInactive),
            }}
            title={`${milestone}-day milestone`}
          >
            {milestone}
          </span>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: {
    minWidth: '240px',
  },
  header: {
    marginBottom: '1.25rem',
  },
  sectionLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-muted)',
  },
  body: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  fireEmoji: {
    fontSize: '3rem',
  },
  countArea: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.375rem',
  },
  count: {
    fontFamily: 'var(--font-heading)',
    fontSize: '3.5rem',
    color: 'var(--color-gold)',
    lineHeight: 1,
  },
  countLabel: {
    fontSize: '1.1rem',
    color: 'var(--color-text-muted)',
  },
  streakLine: {
    fontSize: '0.95rem',
    color: 'var(--color-saffron)',
    marginBottom: '0.5rem',
  },
  lastSeen: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginBottom: '1.25rem',
  },
  milestones: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginTop: '0.75rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '0.75rem',
    fontWeight: 700,
    border: '1px solid',
  },
  badgeActive: {
    background: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'var(--color-gold)',
    color: 'var(--color-gold)',
  },
  badgeInactive: {
    background: 'transparent',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-muted)',
  },
};
