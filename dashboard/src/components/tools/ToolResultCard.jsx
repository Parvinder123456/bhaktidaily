'use client';

/**
 * ToolResultCard — Displays structured spiritual result sections.
 *
 * Props:
 *   sections {Array<{ icon: string, label: string, content: string }>}
 */
export default function ToolResultCard({ sections = [] }) {
  return (
    <div style={styles.card} className="fade-in">
      {sections.map((section, idx) => (
        <div
          key={idx}
          style={{
            ...styles.section,
            ...(idx < sections.length - 1 ? styles.sectionBorder : {}),
          }}
        >
          {/* Icon + Label row */}
          <div style={styles.sectionHeader}>
            {section.icon && (
              <span style={styles.icon} aria-hidden="true">
                {section.icon}
              </span>
            )}
            <span style={styles.label}>{section.label}</span>
          </div>

          {/* Content */}
          <p style={styles.content}>{section.content}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    background: 'linear-gradient(145deg, #FFFDF5 0%, #FFF8E7 100%)',
    border: '1.5px solid #C8860A',
    borderRadius: '16px',
    padding: '0',
    overflow: 'hidden',
    boxShadow:
      '0 4px 24px rgba(255,140,0,0.15), 0 1px 4px rgba(0,0,0,0.25)',
    /* Fade-in defined in globals.css .fade-in — also add inline fallback */
    animation: 'fadeIn 0.45s ease both',
  },
  section: {
    padding: '1.25rem 1.5rem',
  },
  sectionBorder: {
    borderBottom: '1px solid rgba(200,134,10,0.18)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  icon: {
    fontSize: '1.2rem',
    lineHeight: 1,
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#C8860A',
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Inter", system-ui, sans-serif',
  },
  content: {
    fontSize: '1rem',
    color: '#3D2A00',
    lineHeight: 1.7,
    fontFamily:
      '"Noto Sans Devanagari", "Noto Sans", "Mangal", "Arial Unicode MS", "Inter", system-ui, sans-serif',
  },
};
