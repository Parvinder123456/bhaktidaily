'use client';

export default function TodayMessageCard({ message = null, deliveryTime = '07:00' }) {
  if (!message) {
    return (
      <div className="glass-card" style={styles.card}>
        <p style={styles.sectionLabel}>Today&apos;s Message</p>
        <div style={styles.pendingState}>
          <span style={styles.pendingIcon}>🌅</span>
          <p style={styles.pendingText}>
            Your daily message will arrive at{' '}
            <strong style={{ color: 'var(--color-saffron)' }}>{formatTime(deliveryTime)}</strong>
          </p>
          <p style={styles.pendingSubtext}>
            Keep your streak going by replying when it arrives!
          </p>
        </div>
      </div>
    );
  }

  const verseText = message.verseText || '';

  return (
    <div className="glass-card fade-in" style={styles.card}>
      <div style={styles.cardHeader}>
        <p style={styles.sectionLabel}>Today&apos;s Message</p>
        {message.sentAt && (
          <span style={styles.timestamp}>
            Sent at{' '}
            {new Date(message.sentAt).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {/* Rashi Reading */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>☀️ Rashi Reading</h3>
        <p style={styles.sectionBody}>{message.horoscope}</p>
      </div>

      <hr className="divider" />

      {/* Verse */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📖 Today&apos;s Verse</h3>
        <blockquote style={styles.verse}>
          <p style={styles.verseText}>&ldquo;{verseText}&rdquo;</p>
        </blockquote>
      </div>

      <hr className="divider" />

      {/* Challenge */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔥 Daily Challenge</h3>
        <p style={styles.challengeText}>{message.challenge}</p>
      </div>

      {/* Replied indicator */}
      {message.replied && (
        <div style={styles.repliedBadge}>
          ✓ You replied to this message
        </div>
      )}
    </div>
  );
}

function formatTime(hhmm) {
  if (!hhmm) return '07:00 AM';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

const styles = {
  card: {
    flex: 1,
  },
  cardHeader: {
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
  timestamp: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
  },
  section: {
    marginBottom: '0.5rem',
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.1rem',
    color: 'var(--color-gold)',
    marginBottom: '0.5rem',
  },
  sectionBody: {
    fontSize: '0.95rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
  },
  verse: {
    borderLeft: '3px solid var(--color-saffron)',
    paddingLeft: '1rem',
    margin: '0',
  },
  verseText: {
    fontStyle: 'italic',
    fontSize: '0.95rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
  },
  challengeText: {
    fontSize: '0.95rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
    fontWeight: 500,
  },
  repliedBadge: {
    marginTop: '1rem',
    fontSize: '0.8rem',
    color: 'var(--color-success)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  pendingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 0',
    textAlign: 'center',
    gap: '0.75rem',
  },
  pendingIcon: {
    fontSize: '3rem',
  },
  pendingText: {
    fontSize: '1rem',
    color: 'var(--color-text-primary)',
  },
  pendingSubtext: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
};
