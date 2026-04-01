'use client';
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TOOL_NAMES = ['name_meaning', 'panchang', 'raashifal', 'dream', 'dharma_naam'];
const TOOL_LABELS = {
  name_meaning: 'Naam Ka Rahasya',
  panchang: 'Aaj Ka Panchang',
  raashifal: 'Aaj Ka Raashifal',
  dream: 'Swapna Phal',
  dharma_naam: 'Dharma Naam',
};

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function conversionBorderColor(rate) {
  const n = parseFloat(rate);
  if (n >= 20) return '#48bb78'; // green
  if (n >= 10) return '#f6ad55'; // yellow
  return '#e05555';              // red
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function exportCsv(leads) {
  const headers = ['Phone', 'Tool', 'Date', 'Metadata', 'Converted'];
  const rows = leads.map((l) => [
    l.phone,
    TOOL_LABELS[l.toolName] || l.toolName,
    formatDate(l.createdAt),
    l.metadata ? JSON.stringify(l.metadata) : '',
    l.converted ? 'Yes' : 'No',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tool-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ToolLeadsDashboard() {
  const [stats, setStats]       = useState(null);
  const [leads, setLeads]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [statsError, setStatsError] = useState('');
  const [leadsError, setLeadsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);

  // Filters
  const [filterTool, setFilterTool]           = useState('');
  const [filterConverted, setFilterConverted] = useState('');
  const [filterFrom, setFilterFrom]           = useState('');
  const [filterTo, setFilterTo]               = useState('');

  const LIMIT = 25;

  // ---------------------------------------------------------------------------
  // Fetch stats
  // ---------------------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/tools/stats`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setStats(await res.json());
    } catch (err) {
      setStatsError('Could not load stats: ' + err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch leads (paginated + filtered)
  // ---------------------------------------------------------------------------
  const fetchLeads = useCallback(async (currentPage) => {
    setLeadsLoading(true);
    setLeadsError('');
    try {
      const params = new URLSearchParams({ page: currentPage, limit: LIMIT });
      if (filterTool)      params.set('toolName', filterTool);
      if (filterConverted) params.set('converted', filterConverted);
      if (filterFrom)      params.set('from', filterFrom);
      if (filterTo)        params.set('to', filterTo);

      const res = await fetch(`${API_BASE}/api/admin/tools/leads?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      setLeadsError('Could not load leads: ' + err.message);
    } finally {
      setLeadsLoading(false);
    }
  }, [filterTool, filterConverted, filterFrom, filterTo]);

  // Initial load
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    setPage(1);
    fetchLeads(1);
  }, [fetchLeads]);

  function handlePagePrev() {
    const next = Math.max(1, page - 1);
    setPage(next);
    fetchLeads(next);
  }
  function handlePageNext() {
    const maxPage = Math.ceil(total / LIMIT);
    if (page < maxPage) {
      const next = page + 1;
      setPage(next);
      fetchLeads(next);
    }
  }

  function handleApplyFilters() {
    setPage(1);
    fetchLeads(1);
  }

  function handleClearFilters() {
    setFilterTool('');
    setFilterConverted('');
    setFilterFrom('');
    setFilterTo('');
  }

  // CSV uses currently loaded page of leads — acceptable for <25 rows
  function handleExportCsv() {
    exportCsv(leads);
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="glass-card" style={styles.card}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Tool Leads</span>
        <span style={styles.icon}>📊</span>
      </div>
      <p style={styles.hint}>
        Lead capture analytics across all 5 viral tools. Tracks phone captures, WhatsApp activations, and conversion to Daily Divine subscribers.
      </p>

      {/* ── Stats bar ── */}
      {statsLoading && <p style={styles.loadingText}>Loading stats...</p>}
      {statsError  && <p style={styles.errorText}>{statsError}</p>}
      {stats && !statsLoading && (
        <>
          <div style={styles.statBar}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.totalLeads}</span>
              <span style={styles.statLabel}>Total Leads</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.totalConverted}</span>
              <span style={styles.statLabel}>Converted</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={{ ...styles.statValue, color: 'var(--color-saffron)' }}>
                {stats.overallConversionRate}
              </span>
              <span style={styles.statLabel}>Conv. Rate</span>
            </div>
          </div>

          {/* ── Per-tool mini-cards ── */}
          {stats.byTool && stats.byTool.length > 0 && (
            <div style={styles.toolCardsRow}>
              {TOOL_NAMES.map((key) => {
                const t = stats.byTool.find((x) => x.toolName === key);
                const rate = t ? t.conversionRate : '0%';
                return (
                  <div
                    key={key}
                    style={{
                      ...styles.toolMiniCard,
                      borderLeftColor: conversionBorderColor(rate),
                    }}
                  >
                    <div style={styles.toolMiniName}>{TOOL_LABELS[key]}</div>
                    <div style={styles.toolMiniLeads}>{t ? t.totalLeads : 0} leads</div>
                    <div style={{ ...styles.toolMiniRate, color: conversionBorderColor(rate) }}>
                      {rate}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Filter row ── */}
      <div style={styles.filterRow}>
        <select
          value={filterTool}
          onChange={(e) => setFilterTool(e.target.value)}
          style={styles.select}
        >
          <option value="">All Tools</option>
          {TOOL_NAMES.map((k) => (
            <option key={k} value={k}>{TOOL_LABELS[k]}</option>
          ))}
        </select>

        <select
          value={filterConverted}
          onChange={(e) => setFilterConverted(e.target.value)}
          style={styles.select}
        >
          <option value="">All Statuses</option>
          <option value="true">Converted</option>
          <option value="false">Not Converted</option>
        </select>

        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          style={{ ...styles.input, width: '130px' }}
          title="From date"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          style={{ ...styles.input, width: '130px' }}
          title="To date"
        />

        <button onClick={handleApplyFilters} className="btn-primary" style={styles.filterBtn}>
          Apply
        </button>
        <button onClick={handleClearFilters} className="btn-secondary" style={styles.filterBtn}>
          Clear
        </button>
        <button onClick={handleExportCsv} className="btn-secondary" style={styles.filterBtn} disabled={leads.length === 0}>
          Export CSV
        </button>
      </div>

      {/* ── Leads table ── */}
      {leadsLoading && <p style={styles.loadingText}>Loading leads...</p>}
      {leadsError   && <p style={styles.errorText}>{leadsError}</p>}
      {!leadsLoading && !leadsError && (
        <>
          {leads.length === 0 ? (
            <p style={styles.emptyText}>No leads found for the selected filters.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Tool</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Metadata</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} style={styles.tr}>
                      <td style={styles.td}>{lead.phone}</td>
                      <td style={styles.td}>
                        <span style={styles.toolBadge}>
                          {TOOL_LABELS[lead.toolName] || lead.toolName}
                        </span>
                      </td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {formatDate(lead.createdAt)}
                      </td>
                      <td style={{ ...styles.td, maxWidth: '200px' }}>
                        {lead.metadata ? (
                          <span style={styles.metaPreview}>
                            {Object.entries(lead.metadata)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontSize: '1rem' }}>
                        {lead.converted ? '✅' : '❌'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          <div style={styles.pagination}>
            <button
              onClick={handlePagePrev}
              disabled={page <= 1}
              className="btn-secondary"
              style={styles.pageBtn}
            >
              Prev
            </button>
            <span style={styles.pageInfo}>
              Page {page} of {totalPages} &nbsp;({total} total)
            </span>
            <button
              onClick={handlePageNext}
              disabled={page >= totalPages}
              className="btn-secondary"
              style={styles.pageBtn}
            >
              Next
            </button>
          </div>
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
    width: '100%',
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
  loadingText: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    marginBottom: '0.75rem',
  },
  errorText: {
    fontSize: '0.82rem',
    color: 'var(--color-error, #e05555)',
    marginBottom: '0.75rem',
  },
  emptyText: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    padding: '1.5rem 0',
    textAlign: 'center',
  },
  // Stats bar
  statBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    padding: '0.875rem 1.25rem',
    marginBottom: '1.25rem',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: '1px',
    height: '2rem',
    background: 'var(--color-border)',
  },
  statValue: {
    fontSize: '1.6rem',
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    lineHeight: 1.1,
    color: 'var(--color-text-primary)',
  },
  statLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--color-text-muted)',
    marginTop: '0.2rem',
  },
  // Per-tool mini-cards
  toolCardsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.625rem',
    marginBottom: '1.25rem',
  },
  toolMiniCard: {
    flex: '1 1 140px',
    minWidth: '120px',
    padding: '0.625rem 0.75rem',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--color-border)',
    borderLeft: '3px solid #e05555', // overridden inline
  },
  toolMiniName: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    marginBottom: '0.25rem',
  },
  toolMiniLeads: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  toolMiniRate: {
    fontSize: '0.78rem',
    fontWeight: 600,
    marginTop: '0.15rem',
  },
  // Filter row
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.625rem',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  select: {
    padding: '0.45rem 0.625rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-primary)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    outline: 'none',
  },
  input: {
    padding: '0.45rem 0.625rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  filterBtn: {
    padding: '0.45rem 0.875rem',
    fontSize: '0.82rem',
  },
  // Table
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    marginBottom: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  th: {
    padding: '0.625rem 0.875rem',
    textAlign: 'left',
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.02)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: '0.625rem 0.875rem',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  },
  toolBadge: {
    display: 'inline-block',
    background: 'rgba(255, 153, 51, 0.12)',
    border: '1px solid rgba(255, 153, 51, 0.25)',
    color: 'var(--color-saffron)',
    borderRadius: '12px',
    padding: '0.15rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  metaPreview: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
    maxWidth: '200px',
  },
  // Pagination
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    paddingTop: '0.5rem',
  },
  pageBtn: {
    padding: '0.4rem 0.875rem',
    fontSize: '0.82rem',
  },
  pageInfo: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
  },
};
