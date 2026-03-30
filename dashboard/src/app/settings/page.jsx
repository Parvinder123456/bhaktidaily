'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn, logout } from '@/lib/auth';
import { api } from '@/lib/api';

const RASHIS = [
  'Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Sinh', 'Kanya',
  'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen',
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish (Hindi + English mix)' },
  { value: 'both', label: 'Both (English + Hindi)' },
];

const DELIVERY_PRESETS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
];

export default function SettingsPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    rashi: '',
    language: 'en',
    deliveryTime: '07:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    loadProfile();
  }, [router]);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setForm({
        rashi: data.rashi || '',
        language: data.language || 'en',
        deliveryTime: data.deliveryTime || '07:00',
      });
    } catch (err) {
      if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
        logout();
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile(form);
      showToast('Settings saved! Your next daily message will reflect these changes.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading settings…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <Link href="/dashboard" style={styles.navBack}>
          ← Dashboard
        </Link>
        <span style={styles.navTitle}>Settings</span>
      </nav>

      <main style={styles.main}>
        <div className="fade-in" style={styles.header}>
          <h1 style={styles.pageTitle}>⚙️ Preferences</h1>
          <p style={styles.pageSubtitle}>
            Customise your Bhakti Daily experience.
          </p>
        </div>

        <form onSubmit={handleSave} style={styles.form} className="fade-in fade-in-delay-1">
          {/* Rashi */}
          <div className="glass-card" style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Your Rashi (Zodiac Sign)</h2>
            <p style={styles.sectionSubtitle}>
              Used to personalise your daily horoscope reading.
            </p>
            <div style={styles.rashiGrid}>
              {RASHIS.map((rashi) => (
                <button
                  key={rashi}
                  type="button"
                  style={{
                    ...styles.rashiOption,
                    ...(form.rashi === rashi ? styles.rashiOptionActive : {}),
                  }}
                  onClick={() => handleChange('rashi', rashi)}
                >
                  {rashi}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="glass-card" style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Language Preference</h2>
            <p style={styles.sectionSubtitle}>
              Choose the language for your daily messages.
            </p>
            <div style={styles.radioGroup}>
              {LANGUAGES.map(({ value, label }) => (
                <label key={value} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="language"
                    value={value}
                    checked={form.language === value}
                    onChange={() => handleChange('language', value)}
                    style={styles.radioInput}
                  />
                  <span style={styles.radioText}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Time */}
          <div className="glass-card" style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Daily Delivery Time (IST)</h2>
            <p style={styles.sectionSubtitle}>
              When should your morning message arrive?
            </p>
            <div style={styles.timeOptions}>
              {DELIVERY_PRESETS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  style={{
                    ...styles.timeOption,
                    ...(form.deliveryTime === value ? styles.timeOptionActive : {}),
                  }}
                  onClick={() => handleChange('deliveryTime', value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={styles.customTimeRow}>
              <label style={styles.customTimeLabel} htmlFor="customTime">
                Custom time:
              </label>
              <input
                id="customTime"
                type="time"
                className="input-field"
                value={form.deliveryTime}
                onChange={(e) => handleChange('deliveryTime', e.target.value)}
                style={styles.customTimeInput}
              />
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            className="btn-primary"
            style={styles.saveBtn}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* Logout */}
        <div className="fade-in fade-in-delay-2" style={styles.dangerZone}>
          <button
            type="button"
            className="btn-secondary"
            style={styles.logoutBtn}
            onClick={() => { logout(); router.replace('/login'); }}
          >
            Sign out
          </button>
        </div>
      </main>

      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
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
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    maxWidth: '700px',
    margin: '0 auto',
    borderBottom: '1px solid var(--color-border)',
  },
  navBack: {
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
    maxWidth: '700px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem 4rem',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formSection: {
    padding: '1.75rem',
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.2rem',
    color: 'var(--color-gold)',
    marginBottom: '0.375rem',
  },
  sectionSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    marginBottom: '1.25rem',
  },
  rashiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '0.625rem',
  },
  rashiOption: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 150ms ease',
    fontFamily: 'var(--font-body)',
  },
  rashiOptionActive: {
    background: 'rgba(255, 153, 51, 0.15)',
    borderColor: 'var(--color-saffron)',
    color: 'var(--color-saffron)',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  radioInput: {
    accentColor: 'var(--color-saffron)',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  radioText: {
    fontSize: '0.95rem',
    color: 'var(--color-text-primary)',
  },
  timeOptions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  timeOption: {
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 150ms ease',
    fontFamily: 'var(--font-body)',
  },
  timeOptionActive: {
    background: 'rgba(255, 153, 51, 0.15)',
    borderColor: 'var(--color-saffron)',
    color: 'var(--color-saffron)',
  },
  customTimeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '0.75rem',
  },
  customTimeLabel: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  },
  customTimeInput: {
    maxWidth: '160px',
    colorScheme: 'dark',
  },
  saveBtn: {
    alignSelf: 'flex-start',
    padding: '0.875rem 2.5rem',
  },
  dangerZone: {
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid var(--color-border)',
  },
  logoutBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.875rem',
  },
};
