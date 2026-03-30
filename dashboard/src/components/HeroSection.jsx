'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    emoji: '☀️',
    title: 'Daily Rashi Reading',
    description:
      'Receive a spiritually-toned reading for your zodiac sign every morning, grounded in Vedic wisdom — not tabloid astrology.',
  },
  {
    emoji: '📖',
    title: 'Sacred Verses',
    description:
      'Curated shlokas from the Bhagavad Gita, Upanishads, Ramayana, and more — delivered in Sanskrit, English, and Hindi.',
  },
  {
    emoji: '🔥',
    title: 'Streak Challenges',
    description:
      'Build a daily spiritual practice with bite-sized challenges. Reach 7, 21, 40, and 108-day milestones on your Sadhana journey.',
  },
];

export default function HeroSection() {
  const featuresRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.15 }
    );

    const cards = featuresRef.current?.querySelectorAll('.feature-card');
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Hero */}
      <section style={styles.hero}>
        {/* Decorative gradient orbs */}
        <div style={styles.orb1} aria-hidden="true" />
        <div style={styles.orb2} aria-hidden="true" />

        <div style={styles.heroContent} className="fade-in">
          <p style={styles.eyebrow}>🕉️ Sanatan Dharma · Every Morning</p>
          <h1 style={styles.heroTitle}>
            Bhakti<span style={styles.titleAccent}>Daily</span>
          </h1>
          <p style={styles.heroTagline}>
            Your personalised Hindu spiritual companion on WhatsApp.
            <br />
            Daily Rashi readings, sacred verses, and soulful challenges.
          </p>
          <div style={styles.heroActions}>
            <Link href="/login" className="btn-primary" style={styles.ctaButton}>
              Start your Journey 🙏
            </Link>
            <a href="#features" className="btn-secondary">
              Learn more
            </a>
          </div>
        </div>

        {/* Floating message preview */}
        <div style={styles.previewCard} className="glass-card fade-in fade-in-delay-2">
          <p style={styles.previewHeader}>🙏 Namaste Arjun! — Day 21 🔥</p>
          <p style={styles.previewSection}>☀️ Mithun Rashi — Today&apos;s Reading</p>
          <p style={styles.previewBody}>
            Mercury&apos;s clarity guides you today. Speak your truth with compassion,
            for dharmic speech is the foundation of right action.
          </p>
          <p style={styles.previewVerse}>
            &ldquo;Niyataṁ kuru karma tvaṁ karma jyāyo hyakarmaṇaḥ&rdquo;
          </p>
          <p style={styles.previewRef}>— Bhagavad Gita, Ch. 3, V. 8</p>
          <p style={styles.previewChallenge}>🔥 Challenge: Speak only what is true, kind, and necessary today.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={styles.features} ref={featuresRef}>
        <h2 style={styles.sectionTitle}>What you receive every morning</h2>
        <div style={styles.featureGrid}>
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={`feature-card glass-card fade-in-delay-${index + 1}`}
              style={styles.featureCard}
            >
              <div style={styles.featureEmoji}>{feature.emoji}</div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section style={styles.ctaSection}>
        <div className="glass-card fade-in" style={styles.ctaInner}>
          <h2 style={styles.ctaTitle}>Begin your Sadhana today</h2>
          <p style={styles.ctaSubtitle}>
            Join thousands of seekers receiving daily divine guidance on WhatsApp.
          </p>
          <Link href="/login" className="btn-primary">
            Get started — it&apos;s free 🙏
          </Link>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline styles (avoids Tailwind dependency; matches design spec)
// ---------------------------------------------------------------------------
const styles = {
  hero: {
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3rem',
    padding: '6rem 1.5rem 4rem',
    maxWidth: '1200px',
    margin: '0 auto',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    top: '-10%',
    left: '-5%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,153,51,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute',
    bottom: '-5%',
    right: '-5%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContent: {
    flex: '1 1 380px',
    maxWidth: '560px',
    zIndex: 1,
  },
  eyebrow: {
    fontSize: '0.875rem',
    fontWeight: 500,
    letterSpacing: '0.1em',
    color: 'var(--color-text-muted)',
    marginBottom: '1rem',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(3rem, 7vw, 5rem)',
    color: 'var(--color-text-primary)',
    marginBottom: '1.25rem',
  },
  titleAccent: {
    color: 'var(--color-saffron)',
  },
  heroTagline: {
    fontSize: '1.125rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.7,
    marginBottom: '2rem',
  },
  heroActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
  },
  ctaButton: {
    fontSize: '1rem',
    padding: '0.875rem 2rem',
  },
  previewCard: {
    flex: '1 1 300px',
    maxWidth: '360px',
    zIndex: 1,
  },
  previewHeader: {
    fontWeight: 600,
    marginBottom: '0.75rem',
    color: 'var(--color-saffron)',
  },
  previewSection: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--color-gold)',
    marginBottom: '0.5rem',
  },
  previewBody: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    marginBottom: '0.75rem',
    lineHeight: 1.6,
  },
  previewVerse: {
    fontStyle: 'italic',
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    marginBottom: '0.25rem',
  },
  previewRef: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginBottom: '0.75rem',
  },
  previewChallenge: {
    fontSize: '0.875rem',
    color: 'var(--color-saffron)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '0.75rem',
  },
  features: {
    padding: '5rem 1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    marginBottom: '3rem',
    color: 'var(--color-text-primary)',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  featureCard: {
    textAlign: 'left',
    opacity: 0,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  featureEmoji: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  featureTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    color: 'var(--color-gold)',
    marginBottom: '0.5rem',
  },
  featureDesc: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.65,
  },
  ctaSection: {
    padding: '4rem 1.5rem 6rem',
    textAlign: 'center',
  },
  ctaInner: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  ctaTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
    marginBottom: '1rem',
  },
  ctaSubtitle: {
    fontSize: '1.05rem',
    color: 'var(--color-text-muted)',
    marginBottom: '2rem',
  },
};
