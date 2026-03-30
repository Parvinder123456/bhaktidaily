'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, isLoggedIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card} className="glass-card fade-in">
        {/* Header */}
        <Link href="/" style={styles.backLink}>
          &larr; Back
        </Link>
        <div style={styles.logoArea}>
          <span style={styles.logo}>Bhakti Daily</span>
          <h1 style={styles.title}>Sign in to your account</h1>
          <p style={styles.subtitle}>
            Enter your phone number and password to continue.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label} htmlFor="phone">
            Phone number (with country code)
          </label>
          <input
            id="phone"
            type="tel"
            className="input-field"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            disabled={loading}
          />
          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'var(--color-bg)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem',
  },
  backLink: {
    display: 'inline-block',
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    marginBottom: '1.5rem',
    textDecoration: 'none',
  },
  logoArea: {
    marginBottom: '2rem',
  },
  logo: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    color: 'var(--color-saffron)',
    display: 'block',
    marginBottom: '1rem',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.75rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#FCA5A5',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    marginBottom: '0.25rem',
  },
  submitBtn: {
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.875rem',
  },
};
