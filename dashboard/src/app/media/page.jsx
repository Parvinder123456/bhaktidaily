'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn, logout } from '@/lib/auth';
import { api } from '@/lib/api';

// Predefined key → label mapping for the dropdown
const PREDEFINED_KEYS = [
  { key: 'tuesday_audio',   label: 'Tuesday: Hanuman Chalisa Audio',  defaultType: 'audio' },
  { key: 'tuesday_image',   label: 'Tuesday: Hanuman Image',           defaultType: 'image' },
  { key: 'thursday_image',  label: 'Thursday: Fact Post Image',        defaultType: 'image' },
  { key: 'friday_image',    label: 'Friday: Naam Feature Image',       defaultType: 'image' },
  { key: 'saturday_image',  label: 'Saturday: Shani Image',            defaultType: 'image' },
  { key: 'sunday_image',    label: 'Sunday: Q&A Image',                defaultType: 'image' },
  { key: 'daily_image',     label: 'Daily Message Image',              defaultType: 'image' },
];

const KEY_META = Object.fromEntries(PREDEFINED_KEYS.map((k) => [k.key, k]));

const EMPTY_FORM = { key: PREDEFINED_KEYS[0].key, url: '', type: PREDEFINED_KEYS[0].defaultType, label: PREDEFINED_KEYS[0].label };

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,audio/mpeg,audio/ogg,audio/mp4';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MediaPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [mediaList, setMediaList]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [submitting, setSubmitting]         = useState(false);
  const [deleting, setDeleting]             = useState(null);
  const [toast, setToast]                   = useState({ show: false, message: '', type: 'success' });

  // Upload state
  const [selectedFile, setSelectedFile]     = useState(null);
  const [uploading, setUploading]           = useState(false);
  const [uploadDone, setUploadDone]         = useState(false);
  const [useManualUrl, setUseManualUrl]     = useState(false);
  const [dragOver, setDragOver]             = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    fetchMedia();
  }, [router]);

  async function fetchMedia() {
    setLoading(true);
    try {
      const data = await api.getMedia();
      setMediaList(data.media || []);
    } catch (err) {
      if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
        logout();
        router.replace('/login');
      } else {
        showToast('Failed to load media config.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  }

  function handleKeyChange(key) {
    const meta = KEY_META[key];
    setForm((prev) => ({
      ...prev,
      key,
      type: meta?.defaultType || 'image',
      label: meta?.label || '',
    }));
  }

  // ---------- File selection ----------

  function handleFileSelect(file) {
    if (!file) return;
    setSelectedFile(file);
    setUploadDone(false);
    // Auto-detect type from MIME
    const category = file.type.startsWith('audio/') ? 'audio' : 'image';
    setForm((p) => ({ ...p, type: category }));
  }

  function onFileInputChange(e) {
    handleFileSelect(e.target.files?.[0]);
  }

  function onDropZoneClick() {
    fileInputRef.current?.click();
  }

  // ---------- Drag & drop ----------

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  // ---------- Upload ----------

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const result = await api.uploadMedia(selectedFile);
      setForm((p) => ({ ...p, url: result.url }));
      setUploadDone(true);
      showToast('File uploaded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  }

  function resetUpload() {
    setSelectedFile(null);
    setUploadDone(false);
    setForm((p) => ({ ...p, url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ---------- Form submit ----------

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.url.trim()) {
      showToast('Upload a file or paste a URL first.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.upsertMedia({ key: form.key, url: form.url.trim(), type: form.type, label: form.label });
      showToast('Media config saved successfully.', 'success');
      setForm(EMPTY_FORM);
      resetUpload();
      setUseManualUrl(false);
      await fetchMedia();
    } catch (err) {
      showToast(err.message || 'Failed to save media config.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(key) {
    if (!window.confirm(`Delete media config for "${key}"?`)) return;
    setDeleting(key);
    try {
      await api.deleteMedia(key);
      showToast('Media config deleted.', 'success');
      setMediaList((prev) => prev.filter((m) => m.key !== key));
    } catch (err) {
      showToast(err.message || 'Failed to delete.', 'error');
    } finally {
      setDeleting(null);
    }
  }

  function handleEdit(item) {
    setForm({ key: item.key, url: item.url, type: item.type, label: item.label });
    setUseManualUrl(true); // show URL field since we already have a URL
    setUploadDone(false);
    setSelectedFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <Link href="/dashboard" style={styles.navBack}>
          ← Dashboard
        </Link>
        <span style={styles.navTitle}>Media Config</span>
        <button
          type="button"
          className="btn-secondary"
          style={styles.logoutBtn}
          onClick={() => { logout(); router.replace('/login'); }}
        >
          Sign out
        </button>
      </nav>

      <main style={styles.main}>
        {/* Header */}
        <div className="fade-in" style={styles.header}>
          <h1 style={styles.pageTitle}>🎵 Media Management</h1>
          <p style={styles.pageSubtitle}>
            Upload audio and image files that get attached to bonus WhatsApp messages.
          </p>
        </div>

        {/* Add / Edit form */}
        <div className="glass-card fade-in fade-in-delay-1" style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Add / Update Media</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Key */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="mediaKey">Message Key</label>
              <select
                id="mediaKey"
                className="input-field"
                value={form.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                style={styles.select}
              >
                {PREDEFINED_KEYS.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <p style={styles.fieldHint}>Which message does this media appear in?</p>
            </div>

            {/* ------- Upload Zone / Manual URL ------- */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Media File
              </label>

              {!useManualUrl ? (
                <>
                  {/* Drop zone */}
                  <div
                    style={{
                      ...styles.dropZone,
                      ...(dragOver ? styles.dropZoneActive : {}),
                      ...(uploadDone ? styles.dropZoneDone : {}),
                    }}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={onDropZoneClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDropZoneClick(); }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_TYPES}
                      onChange={onFileInputChange}
                      style={{ display: 'none' }}
                    />

                    {!selectedFile ? (
                      <div style={styles.dropZoneContent}>
                        <span style={styles.dropIcon}>📁</span>
                        <p style={styles.dropText}>
                          Drop file here or <span style={styles.browseLink}>click to browse</span>
                        </p>
                        <p style={styles.dropHint}>
                          JPEG, PNG, WebP (≤ 5 MB) · MP3, OGG, M4A (≤ 10 MB)
                        </p>
                      </div>
                    ) : (
                      <div style={styles.fileInfoRow}>
                        <div style={styles.fileDetails}>
                          <span style={styles.fileIcon}>
                            {selectedFile.type.startsWith('audio/') ? '🎵' : '🖼️'}
                          </span>
                          <div>
                            <p style={styles.fileName}>{selectedFile.name}</p>
                            <p style={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
                          </div>
                        </div>
                        {uploadDone ? (
                          <span style={styles.uploadedBadge}>✓ Uploaded</span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Upload / Change buttons */}
                  {selectedFile && (
                    <div style={styles.uploadActions}>
                      {!uploadDone ? (
                        <button
                          type="button"
                          className="btn-primary"
                          style={styles.uploadBtn}
                          onClick={handleUpload}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <span style={styles.uploadingText}>
                              <span style={styles.spinner} /> Uploading…
                            </span>
                          ) : (
                            '⬆ Upload File'
                          )}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={styles.changeFileBtn}
                        onClick={resetUpload}
                      >
                        {uploadDone ? '↻ Change file' : '✕ Remove'}
                      </button>
                    </div>
                  )}

                  {/* Uploaded URL display */}
                  {uploadDone && form.url && (
                    <div style={styles.uploadedUrlBox}>
                      <span style={styles.uploadedUrlLabel}>Uploaded to:</span>
                      <span style={styles.uploadedUrlValue}>{form.url}</span>
                    </div>
                  )}

                  {/* Toggle to manual URL */}
                  <button
                    type="button"
                    style={styles.toggleLink}
                    onClick={() => { setUseManualUrl(true); resetUpload(); }}
                  >
                    or paste an existing URL →
                  </button>
                </>
              ) : (
                <>
                  {/* Manual URL input */}
                  <input
                    id="mediaUrl"
                    type="url"
                    className="input-field"
                    placeholder="https://..."
                    value={form.url}
                    onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  />
                  <p style={styles.fieldHint}>Paste a publicly accessible URL (Supabase Storage, CDN, etc.)</p>

                  <button
                    type="button"
                    style={styles.toggleLink}
                    onClick={() => { setUseManualUrl(false); setForm((p) => ({ ...p, url: '' })); }}
                  >
                    ← or upload a file instead
                  </button>
                </>
              )}
            </div>

            {/* Type */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Media Type</label>
              <div style={styles.typeButtons}>
                {['audio', 'image'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    style={{
                      ...styles.typeBtn,
                      ...(form.type === t ? styles.typeBtnActive : {}),
                    }}
                    onClick={() => setForm((p) => ({ ...p, type: t }))}
                  >
                    {t === 'audio' ? '🎵 Audio' : '🖼️ Image'}
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="mediaLabel">Label</label>
              <input
                id="mediaLabel"
                type="text"
                className="input-field"
                placeholder="Human-readable label"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={styles.saveBtn}
              disabled={submitting || (!form.url.trim())}
            >
              {submitting ? 'Saving…' : 'Save Media Config'}
            </button>
          </form>
        </div>

        {/* Media Grid */}
        <div className="fade-in fade-in-delay-2" style={styles.gridSection}>
          <h2 style={styles.sectionTitle}>Configured Media ({mediaList.length})</h2>

          {loading ? (
            <div style={styles.loadingMsg}>
              <span style={{ fontSize: '2rem' }}>🕉️</span>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>Loading media configs…</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="glass-card" style={styles.emptyState}>
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                No media configured yet. Add one using the form above.
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {mediaList.map((item) => (
                <MediaCard
                  key={item.key}
                  item={item}
                  deleting={deleting === item.key}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.key)}
                />
              ))}
            </div>
          )}
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

// ---------------------------------------------------------------------------
// Media Card sub-component
// ---------------------------------------------------------------------------
function MediaCard({ item, deleting, onEdit, onDelete }) {
  const keyMeta = KEY_META[item.key];

  return (
    <div className="glass-card" style={cardStyles.card}>
      {/* Header */}
      <div style={cardStyles.cardHeader}>
        <span style={cardStyles.typePill}>
          {item.type === 'audio' ? '🎵' : '🖼️'} {item.type}
        </span>
        <span style={cardStyles.keyBadge}>{item.key}</span>
      </div>

      {/* Label */}
      <h3 style={cardStyles.label}>{item.label}</h3>

      {/* URL display */}
      <p style={cardStyles.url} title={item.url}>
        {item.url.length > 55 ? `${item.url.slice(0, 52)}…` : item.url}
      </p>

      {/* Preview */}
      <div style={cardStyles.previewBox}>
        {item.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.label}
            style={cardStyles.previewImage}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <audio
            controls
            src={item.url}
            style={cardStyles.audioPlayer}
            preload="none"
          >
            Your browser does not support audio.
          </audio>
        )}
      </div>

      {/* Updated timestamp */}
      <p style={cardStyles.updatedAt}>
        Updated: {new Date(item.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      </p>

      {/* Actions */}
      <div style={cardStyles.actions}>
        <button
          type="button"
          className="btn-secondary"
          style={cardStyles.editBtn}
          onClick={onEdit}
        >
          Edit
        </button>
        <button
          type="button"
          style={cardStyles.deleteBtn}
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
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
  logoutBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem 5rem',
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
  formCard: {
    padding: '2rem',
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.2rem',
    color: 'var(--color-gold)',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  fieldHint: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginTop: '0.25rem',
  },
  select: {
    colorScheme: 'dark',
  },

  // ---------- Drop zone ----------
  dropZone: {
    border: '2px dashed var(--color-border)',
    borderRadius: '12px',
    padding: '2rem 1.5rem',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    background: 'rgba(255, 255, 255, 0.02)',
    textAlign: 'center',
  },
  dropZoneActive: {
    borderColor: 'var(--color-saffron)',
    background: 'rgba(255, 153, 51, 0.06)',
  },
  dropZoneDone: {
    borderColor: 'rgba(52, 211, 153, 0.4)',
    background: 'rgba(52, 211, 153, 0.04)',
  },
  dropZoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dropIcon: {
    fontSize: '2rem',
    opacity: 0.7,
  },
  dropText: {
    color: 'var(--color-text-primary)',
    fontSize: '0.95rem',
  },
  browseLink: {
    color: 'var(--color-saffron)',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
  dropHint: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
  },

  // ---------- File info ----------
  fileInfoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  fileDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textAlign: 'left',
  },
  fileIcon: {
    fontSize: '1.5rem',
  },
  fileName: {
    color: 'var(--color-text-primary)',
    fontSize: '0.9rem',
    fontWeight: 500,
    wordBreak: 'break-all',
  },
  fileSize: {
    color: 'var(--color-text-muted)',
    fontSize: '0.8rem',
  },
  uploadedBadge: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#34D399',
    background: 'rgba(52, 211, 153, 0.1)',
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid rgba(52, 211, 153, 0.25)',
    whiteSpace: 'nowrap',
  },

  // ---------- Upload actions ----------
  uploadActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  uploadBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.875rem',
  },
  changeFileBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.85rem',
  },
  uploadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  // ---------- Uploaded URL box ----------
  uploadedUrlBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginTop: '0.25rem',
  },
  uploadedUrlLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  uploadedUrlValue: {
    fontSize: '0.8rem',
    color: 'var(--color-saffron)',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },

  // ---------- Toggle link ----------
  toggleLink: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.25rem 0',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    alignSelf: 'flex-start',
    fontFamily: 'var(--font-body)',
    transition: 'color 150ms ease',
    marginTop: '0.25rem',
  },

  // ---------- Rest ----------
  typeButtons: {
    display: 'flex',
    gap: '0.75rem',
  },
  typeBtn: {
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
  typeBtnActive: {
    background: 'rgba(255, 153, 51, 0.15)',
    borderColor: 'var(--color-saffron)',
    color: 'var(--color-saffron)',
  },
  saveBtn: {
    alignSelf: 'flex-start',
    padding: '0.875rem 2.5rem',
  },
  gridSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loadingMsg: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem',
  },
  emptyState: {
    padding: '3rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
};

const cardStyles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  typePill: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-saffron)',
    background: 'rgba(255, 153, 51, 0.1)',
    padding: '0.25rem 0.625rem',
    borderRadius: '999px',
    border: '1px solid rgba(255, 153, 51, 0.25)',
  },
  keyBadge: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    background: 'rgba(255,255,255,0.04)',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontFamily: 'monospace',
  },
  label: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1rem',
    color: 'var(--color-text-primary)',
  },
  url: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  previewBox: {
    borderRadius: '10px',
    overflow: 'hidden',
    background: 'rgba(0,0,0,0.3)',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
    display: 'block',
  },
  audioPlayer: {
    width: '100%',
    padding: '0.5rem',
    colorScheme: 'dark',
  },
  updatedAt: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.25rem',
  },
  editBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    flex: 1,
  },
  deleteBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    flex: 1,
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#FCA5A5',
    cursor: 'pointer',
    transition: 'background 150ms ease',
    fontFamily: 'var(--font-body)',
  },
};
