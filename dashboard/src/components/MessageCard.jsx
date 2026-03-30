'use client';

export default function MessageCard({ message }) {
  if (!message) return null;

  const formattedDate = new Date(message.date).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Truncate verse to 120 characters for the card snippet
  const verseSnippet =
    message.verseText && message.verseText.length > 120
      ? `${message.verseText.slice(0, 120)}…`
      : message.verseText || '';

  const challengeSnippet =
    message.challenge && message.challenge.length > 100
      ? `${message.challenge.slice(0, 100)}…`
      : message.challenge || '';

  return (
    <article className="glass-card" style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <time style={styles.date}>{formattedDate}</time>
        <div style={styles.badges}>
          {message.replied && (
            <span style={styles.repliedBadge} title="You replied">✓ replied</span>
          )}
        </div>
      </div>

      {/* Horoscope snippet */}
      {message.horoscope && (
        <div style={styles.section}>
          <span style={styles.sectionIcon}>☀️</span>
          <p style={styles.horoscopeText}>
            {message.horoscope.length > 140
              ? `${message.horoscope.slice(0, 140)}…`
              : message.horoscope}
          </p>
        </div>
      )}

      {/* Verse */}
      {verseSnippet && (
        <blockquote style={styles.verse}>
          <p style={styles.verseText}>📖 &ldquo;{verseSnippet}&rdquo;</p>
        </blockquote>
      )}

      {/* Challenge */}
      {challengeSnippet && (
        <p style={styles.challenge}>🔥 {challengeSnippet}</p>
      )}
    </article>
  );
}

const styles = {
  card: {
    marginBottom: '1rem',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  date: {
    fontWeight: 600,
    color: 'var(--color-gold)',
    fontSize: '0.95rem',
  },
  badges: {
    display: 'flex',
    gap: '0.5rem',
  },
  repliedBadge: {
    fontSize: '0.75rem',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success)',
    borderRadius: '20px',
    padding: '0.2rem 0.625rem',
  },
  section: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  sectionIcon: {
    flexShrink: 0,
    fontSize: '1rem',
    marginTop: '0.1rem',
  },
  horoscopeText: {
    fontSize: '0.9rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1.65,
  },
  verse: {
    borderLeft: '2px solid var(--color-saffron)',
    paddingLeft: '0.875rem',
    marginBottom: '0.75rem',
  },
  verseText: {
    fontStyle: 'italic',
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  challenge: {
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    lineHeight: 1.6,
    borderTop: '1px solid var(--color-border)',
    paddingTop: '0.75rem',
  },
};
