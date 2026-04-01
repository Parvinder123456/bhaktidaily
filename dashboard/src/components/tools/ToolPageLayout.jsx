'use client';

/**
 * ToolPageLayout — Shared wrapper for all viral lead-gen tool pages.
 *
 * Props:
 *   title    {string}  — Page heading (e.g. "Naam Ka Rahasya")
 *   subtitle {string}  — One-line subheading
 *   children {node}    — Page body content
 */
export default function ToolPageLayout({ title, subtitle, children }) {
  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.omWrapper}>
            <span style={styles.omSymbol} aria-hidden="true">ॐ</span>
          </div>
          <h1 style={styles.title}>{title}</h1>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
      </header>

      {/* Body */}
      <main style={styles.main}>
        <div style={styles.content}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>Daily Divine — Roz Ka Divya Sandesh</span>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(160deg, #1A0A00 0%, #2D1200 40%, #1A0800 100%)',
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif',
    color: '#F5ECD7',
  },

  /* ---- Header ---- */
  header: {
    background: 'linear-gradient(135deg, rgba(255,107,53,0.18) 0%, rgba(255,140,0,0.12) 100%)',
    borderBottom: '1px solid rgba(255,153,51,0.25)',
    padding: '2.5rem 1.5rem 2rem',
    textAlign: 'center',
  },
  headerInner: {
    maxWidth: '680px',
    margin: '0 auto',
  },
  omWrapper: {
    marginBottom: '0.75rem',
  },
  omSymbol: {
    fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
    background: 'linear-gradient(135deg, #FF9933, #FFD700)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'inline-block',
    lineHeight: 1,
    fontFamily:
      '"Noto Sans Devanagari", "Mangal", "Arial Unicode MS", serif',
  },
  title: {
    fontFamily:
      '"Yatra One", "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", serif',
    fontSize: 'clamp(1.75rem, 4vw, 2.6rem)',
    color: '#FFD700',
    marginBottom: '0.5rem',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
    color: '#C8A96E',
    lineHeight: 1.6,
  },

  /* ---- Main ---- */
  main: {
    flex: 1,
    padding: '2.5rem 1.5rem',
  },
  content: {
    maxWidth: '680px',
    margin: '0 auto',
  },

  /* ---- Footer ---- */
  footer: {
    padding: '1.25rem 1.5rem',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,153,51,0.12)',
    background: 'rgba(0,0,0,0.2)',
  },
  footerText: {
    fontSize: '0.8rem',
    color: '#9E8A6F',
    letterSpacing: '0.04em',
  },
};
