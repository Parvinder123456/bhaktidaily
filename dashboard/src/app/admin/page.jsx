'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn, logout } from '@/lib/auth';

import ContentPoolCard from '@/components/ContentPoolCard';
import PromptVariationCard from '@/components/PromptVariationCard';
import CalendarWidget from '@/components/CalendarWidget';
import EngagementHeatmap from '@/components/EngagementHeatmap';
import ABTestingCard from '@/components/ABTestingCard';
import WeeklyThemeCard from '@/components/WeeklyThemeCard';
import TestMessageCard from '@/components/TestMessageCard';
import ToolTesterCard from '@/components/ToolTesterCard';
import ToolLeadsDashboard from '@/components/ToolLeadsDashboard';

/**
 * Admin Intelligence Dashboard — /admin
 *
 * Aggregates all self-improvement system intelligence widgets:
 *   - Content pool levels (trivia / facts / chaupais)
 *   - Today's prompt lens and variation info
 *   - Hindu calendar events for the next 7 days
 *   - Engagement tier distribution
 *   - A/B prompt variant performance
 *   - Current week in the 12-week Shraddha-Moksha arc
 *
 * Each card fetches its own data independently so partial failures
 * don't take down the entire dashboard.
 *
 * Auth: same JWT gate as the user dashboard.
 */
export default function AdminPage() {
  const router = useRouter();

  // Auth guard — re-uses the same token/auth as the user dashboard
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
    }
  }, [router]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div style={styles.page}>
      {/* Nav — identical pattern to dashboard/page.jsx */}
      <nav style={styles.nav}>
        <Link href="/" style={styles.navLogo}>
          🕉️ <span style={{ color: 'var(--color-saffron)' }}>Bhakti</span>Daily
        </Link>
        <div style={styles.navLinks}>
          <Link href="/dashboard" style={styles.navLink}>Dashboard</Link>
          <Link href="/history" style={styles.navLink}>History</Link>
          <Link href="/settings" style={styles.navLink}>Settings</Link>
          <Link href="/media" style={styles.navLink}>Media</Link>
          <button onClick={handleLogout} className="btn-secondary" style={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        {/* Page heading */}
        <div className="fade-in" style={styles.heading}>
          <h1 style={styles.headingTitle}>Intelligence Dashboard</h1>
          <p style={styles.headingSubtitle}>
            Self-improvement system — content pool, prompt variations, calendar, engagement, A/B tests
          </p>
        </div>

        {/* ── Row 1: Weekly theme (wide) + Prompt variation ── */}
        <section style={styles.sectionLabel}>
          <span style={styles.rowLabel}>Narrative &amp; Prompt</span>
        </section>
        <div className="fade-in fade-in-delay-1" style={styles.row}>
          <div style={{ flex: '1 1 320px', minWidth: '280px' }}>
            <WeeklyThemeCard />
          </div>
          <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
            <PromptVariationCard />
          </div>
        </div>

        {/* ── Row 2: Content pool + Engagement heatmap ── */}
        <section style={styles.sectionLabel}>
          <span style={styles.rowLabel}>Content &amp; Users</span>
        </section>
        <div className="fade-in fade-in-delay-2" style={styles.row}>
          <div style={{ flex: '1 1 280px', minWidth: '260px' }}>
            <ContentPoolCard />
          </div>
          <div style={{ flex: '1 1 280px', minWidth: '260px' }}>
            <EngagementHeatmap />
          </div>
        </div>

        {/* ── Row 3: A/B testing + Calendar ── */}
        <section style={styles.sectionLabel}>
          <span style={styles.rowLabel}>A/B Tests &amp; Calendar</span>
        </section>
        <div className="fade-in fade-in-delay-3" style={styles.row}>
          <div style={{ flex: '1 1 280px', minWidth: '260px' }}>
            <ABTestingCard featureKey="bhagwan_sandesh" />
          </div>
          <div style={{ flex: '2 1 340px', minWidth: '300px' }}>
            <CalendarWidget />
          </div>
        </div>

        {/* ── Row 4: Test Message + Tool Tester ── */}
        <section style={styles.sectionLabel}>
          <span style={styles.rowLabel}>Testing</span>
        </section>
        <div className="fade-in fade-in-delay-3" style={styles.row}>
          <div style={{ flex: '1 1 340px', minWidth: '300px', maxWidth: '560px' }}>
            <TestMessageCard />
          </div>
          <div style={{ flex: '1 1 340px', minWidth: '300px', maxWidth: '560px' }}>
            <ToolTesterCard />
          </div>
        </div>

        {/* ── Row 5: Tool Leads Dashboard ── */}
        <section style={styles.sectionLabel}>
          <span style={styles.rowLabel}>Viral Tools — Lead Analytics</span>
        </section>
        <div className="fade-in fade-in-delay-3" style={styles.row}>
          <div style={{ flex: '1 1 100%', minWidth: '0' }}>
            <ToolLeadsDashboard />
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    borderBottom: '1px solid var(--color-border)',
  },
  navLogo: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.4rem',
    color: 'var(--color-text-primary)',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  navLink: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
    transition: 'color 150ms ease',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem',
  },
  heading: {
    marginBottom: '2.5rem',
  },
  headingTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    marginBottom: '0.375rem',
  },
  headingSubtitle: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
  },
  sectionLabel: {
    marginBottom: '0.75rem',
    marginTop: '0.25rem',
  },
  rowLabel: {
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--color-text-muted)',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '2.25rem',
    alignItems: 'flex-start',
  },
};
