'use client';
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TOOLS = [
  {
    key: 'naam',
    label: 'Naam Ka Rahasya',
    method: 'POST',
    path: '/tools/name-meaning',
    inputs: [
      { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Arjun' },
    ],
  },
  {
    key: 'panchang',
    label: 'Aaj Ka Panchang',
    method: 'GET',
    path: '/tools/panchang/today',
    inputs: [],
  },
  {
    key: 'raashifal',
    label: 'Aaj Ka Raashifal',
    method: 'POST',
    path: '/tools/raashifal',
    inputs: [
      {
        name: 'rashi',
        label: 'Rashi',
        type: 'select',
        options: ['Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Singh', 'Kanya', 'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen'],
      },
    ],
  },
  {
    key: 'dream',
    label: 'Swapna Phal',
    method: 'POST',
    path: '/tools/dream-interpret',
    inputs: [
      { name: 'dreamDescription', label: 'Dream', type: 'textarea', placeholder: 'Describe the dream...' },
      { name: 'userName', label: 'Name', type: 'text', placeholder: 'e.g. Arjun' },
    ],
  },
  {
    key: 'dharma_naam',
    label: 'Dharma Naam',
    method: 'POST',
    path: '/tools/dharma-naam',
    inputs: [
      { name: 'currentName', label: 'Current Name', type: 'text', placeholder: 'e.g. Ramesh' },
      {
        name: 'rashi',
        label: 'Rashi',
        type: 'select',
        options: ['Mesh', 'Vrishabh', 'Mithun', 'Kark', 'Singh', 'Kanya', 'Tula', 'Vrishchik', 'Dhanu', 'Makar', 'Kumbh', 'Meen'],
      },
    ],
  },
];

export default function ToolTesterCard() {
  const [selectedToolKey, setSelectedToolKey] = useState(TOOLS[0].key);
  const [inputValues, setInputValues]         = useState({});
  const [loading, setLoading]                 = useState(false);
  const [response, setResponse]               = useState(null);   // parsed JSON
  const [responseTime, setResponseTime]       = useState(null);   // ms
  const [statusCode, setStatusCode]           = useState(null);
  const [error, setError]                     = useState('');

  const selectedTool = TOOLS.find((t) => t.key === selectedToolKey);

  function handleToolChange(e) {
    setSelectedToolKey(e.target.value);
    setInputValues({});
    setResponse(null);
    setResponseTime(null);
    setStatusCode(null);
    setError('');
  }

  function handleInputChange(name, value) {
    setInputValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleTest() {
    setLoading(true);
    setError('');
    setResponse(null);
    setResponseTime(null);
    setStatusCode(null);

    const start = performance.now();
    try {
      const url = `${API_BASE}${selectedTool.path}`;
      const isGet = selectedTool.method === 'GET';

      const fetchOptions = {
        method: selectedTool.method,
        headers: isGet ? {} : { 'Content-Type': 'application/json' },
      };

      if (!isGet && selectedTool.inputs.length > 0) {
        fetchOptions.body = JSON.stringify(inputValues);
      }

      const res = await fetch(url, fetchOptions);
      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);
      setStatusCode(res.status);

      let data;
      try {
        data = await res.json();
      } catch {
        data = { _raw: await res.text() };
      }
      setResponse(data);
    } catch (err) {
      setResponseTime(Math.round(performance.now() - start));
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  const statusColor = statusCode
    ? statusCode >= 200 && statusCode < 300
      ? '#48bb78'
      : '#e05555'
    : 'var(--color-text-muted)';

  return (
    <div className="glass-card" style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Tool Tester</span>
        <span style={styles.icon}>🔧</span>
      </div>
      <p style={styles.hint}>
        Test any viral tool endpoint directly from the admin panel — no curl needed.
      </p>

      {/* Tool selector */}
      <label style={styles.label}>Tool</label>
      <select
        value={selectedToolKey}
        onChange={handleToolChange}
        style={styles.select}
        disabled={loading}
      >
        {TOOLS.map((t) => (
          <option key={t.key} value={t.key}>{t.label}</option>
        ))}
      </select>

      {/* Dynamic inputs */}
      {selectedTool.inputs.map((inp) => (
        <div key={inp.name} style={styles.fieldGroup}>
          <label style={styles.label}>{inp.label}</label>
          {inp.type === 'select' ? (
            <select
              value={inputValues[inp.name] || inp.options[0]}
              onChange={(e) => handleInputChange(inp.name, e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              {inp.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : inp.type === 'textarea' ? (
            <textarea
              value={inputValues[inp.name] || ''}
              onChange={(e) => handleInputChange(inp.name, e.target.value)}
              placeholder={inp.placeholder || ''}
              style={styles.textarea}
              disabled={loading}
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={inputValues[inp.name] || ''}
              onChange={(e) => handleInputChange(inp.name, e.target.value)}
              placeholder={inp.placeholder || ''}
              style={styles.input}
              disabled={loading}
            />
          )}
        </div>
      ))}

      {/* Error */}
      {error && <p style={styles.errorText}>{error}</p>}

      {/* Test button */}
      <button
        onClick={handleTest}
        disabled={loading}
        className="btn-primary"
        style={styles.testBtn}
      >
        {loading ? 'Testing...' : 'Test Tool'}
      </button>

      {/* Response meta */}
      {(statusCode !== null || responseTime !== null) && (
        <div style={styles.responseMeta}>
          {statusCode !== null && (
            <span style={{ ...styles.metaBadge, color: statusColor, borderColor: statusColor }}>
              {statusCode}
            </span>
          )}
          {responseTime !== null && (
            <span style={styles.metaBadge}>
              {responseTime} ms
            </span>
          )}
        </div>
      )}

      {/* JSON response viewer */}
      {response !== null && (
        <>
          <p style={styles.responseLabel}>Response</p>
          <pre style={styles.responseViewer}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  card: {
    minWidth: '320px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  sectionLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-muted)',
  },
  icon: {
    fontSize: '1.25rem',
  },
  hint: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.375rem',
  },
  fieldGroup: {
    marginBottom: '1rem',
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.625rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-primary)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    outline: 'none',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-primary)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-primary)',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  errorText: {
    fontSize: '0.82rem',
    color: 'var(--color-error, #e05555)',
    marginBottom: '0.75rem',
  },
  testBtn: {
    width: '100%',
    padding: '0.625rem 1rem',
    fontSize: '0.9rem',
  },
  responseMeta: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginTop: '1rem',
    marginBottom: '0.5rem',
  },
  metaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.2rem 0.625rem',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
  responseLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--color-text-muted)',
    marginBottom: '0.5rem',
  },
  responseViewer: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '0.78rem',
    lineHeight: 1.6,
    color: 'var(--color-text-primary)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '0.875rem',
    maxHeight: '320px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    marginTop: 0,
  },
};
