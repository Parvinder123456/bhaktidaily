'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn, logout } from '@/lib/auth';
import { api } from '@/lib/api';
import MessageCard from '@/components/MessageCard';

export default function HistoryPage() {
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
    }
  }, [router]);

  const loadPage = useCallback(async (pageNum, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      const data = await api.getMessages(pageNum);
      const newMessages = data?.messages || [];

      setMessages((prev) => (append ? [...prev, ...newMessages] : newMessages));
      // If fewer than 10 returned, there are no more pages
      setHasMore(newMessages.length === 10);
    } catch (err) {
      if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
        logout();
        router.replace('/login');
      } else {
        setError('Failed to load message history. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [router]);

  useEffect(() => {
    if (isLoggedIn()) {
      loadPage(1, false);
    }
  }, [loadPage]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, true);
  }

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <Link href="/dashboard" style={styles.navLogo}>
          ← Dashboard
        </Link>
        <span style={styles.navTitle}>Message History</span>
      </nav>

      <main style={styles.main}>
        <div className="fade-in" style={styles.header}>
          <h1 style={styles.pageTitle}>📜 Your Spiritual Journey</h1>
          <p style={styles.pageSubtitle}>
            A timeline of your daily messages and verses.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox} role="alert">{error}</div>
        )}

        {loading ? (
          <div style={styles.loadingArea}>
            <p style={{ color: 'var(--color-text-muted)' }}>Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="glass-card" style={styles.emptyState}>
            <p style={styles.emptyIcon}>🌅</p>
            <p style={styles.emptyText}>No messages yet.</p>
            <p style={styles.emptySubtext}>
              Your daily messages will appear here once they start arriving.
            </p>
            <Link href="/settings" className="btn-primary" style={{ marginTop: '1rem' }}>
              Set your delivery time
            </Link>
          </div>
        ) : (
          <>
            <div style={styles.timeline}>
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className={`fade-in fade-in-delay-${Math.min(i + 1, 4)}`}
                >
                  <MessageCard message={msg} />
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={styles.loadMoreArea}>
                <button
                  className="btn-secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={styles.loadMoreBtn}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}

            {!hasMore && messages.length > 0 && (
              <p style={styles.endNote}>
                You&apos;ve seen all {messages.length} messages. 🙏
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

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
    maxWidth: '800px',
    margin: '0 auto',
    borderBottom: '1px solid var(--color-border)',
  },
  navLogo: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
  },
  navTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.1rem',
    color: 'var(--color-text-primary)',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem',
  },
  header: {
    marginBottom: '2.5rem',
  },
  pageTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
    marginBottom: '0.5rem',
  },
  pageSubtitle: {
    color: 'var(--color-text-muted)',
    fontSize: '1rem',
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
  loadingArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '4rem 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  emptyText: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  emptySubtext: {
    color: 'var(--color-text-muted)',
    fontSize: '0.95rem',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  loadMoreArea: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '2rem',
  },
  loadMoreBtn: {
    padding: '0.75rem 2rem',
  },
  endNote: {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
    marginTop: '2rem',
  },
};
