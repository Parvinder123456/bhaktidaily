'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn, logout } from '@/lib/auth';
import { api } from '@/lib/api';
import StreakCard from '@/components/StreakCard';
import TodayMessageCard from '@/components/TodayMessageCard';

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);
  const [todayMessage, setTodayMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    fetchData();
  }, [router]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [profileData, streakData, messagesData] = await Promise.all([
        api.getProfile(),
        api.getStreak(),
        api.getMessages(1),
      ]);
      setProfile(profileData);
      setStreak(streakData);

      // Today's message: the most recent message if its date matches today (IST)
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const latest = messagesData?.messages?.[0];
      if (latest) {
        const msgDate = new Date(latest.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        setTodayMessage(msgDate === todayIST ? latest : null);
      }
    } catch (err) {
      if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
        logout();
        router.replace('/login');
      } else {
        setError('Failed to load dashboard. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.spinner}>🕉️</div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading your spiritual dashboard…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <Link href="/" style={styles.navLogo}>
          🕉️ <span style={{ color: 'var(--color-saffron)' }}>Bhakti</span>Daily
        </Link>
        <div style={styles.navLinks}>
          <Link href="/history" style={styles.navLink}>History</Link>
          <Link href="/settings" style={styles.navLink}>Settings</Link>
          <Link href="/media" style={styles.navLink}>Media</Link>
          <Link href="/admin" style={styles.navLink}>Admin</Link>
          <button onClick={handleLogout} className="btn-secondary" style={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={styles.main}>
        {/* Greeting */}
        <div className="fade-in" style={styles.greeting}>
          <h1 style={styles.greetingTitle}>
            🙏 Namaste, {profile?.name || 'friend'}!
          </h1>
          <p style={styles.greetingSubtitle}>
            {profile?.rashi ? `${profile.rashi} Rashi` : 'Your'} spiritual companion
          </p>
        </div>

        {error && (
          <div style={styles.errorBox} role="alert">{error}</div>
        )}

        {/* Cards grid */}
        <div style={styles.cardsGrid}>
          {/* Streak */}
          <div className="fade-in fade-in-delay-1">
            <StreakCard
              streakCount={streak?.streakCount ?? profile?.streakCount ?? 0}
              lastInteraction={streak?.lastInteraction}
            />
          </div>

          {/* Today's message */}
          <div className="fade-in fade-in-delay-2" style={{ flex: 2, minWidth: '300px' }}>
            <TodayMessageCard
              message={todayMessage}
              deliveryTime={profile?.deliveryTime}
            />
          </div>
        </div>

        {/* Quick links */}
        <div className="fade-in fade-in-delay-3" style={styles.quickLinks}>
          <Link href="/history" className="btn-secondary" style={styles.quickLink}>
            📜 View Message History
          </Link>
          <Link href="/settings" className="btn-secondary" style={styles.quickLink}>
            ⚙️ Edit Preferences
          </Link>
          <Link href="/media" className="btn-secondary" style={styles.quickLink}>
            🎵 Media Config
          </Link>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
  },
  loadingPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    background: 'var(--color-bg)',
  },
  spinner: {
    fontSize: '3rem',
    animation: 'flicker 1.8s ease-in-out infinite',
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
  greeting: {
    marginBottom: '2.5rem',
  },
  greetingTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    marginBottom: '0.375rem',
  },
  greetingSubtitle: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#FCA5A5',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
  },
  cardsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '2rem',
    alignItems: 'flex-start',
  },
  quickLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  quickLink: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
  },
};
