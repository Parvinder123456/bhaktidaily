'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * CalendarWidget — S3-T5
 *
 * Displays the next 7 days of Hindu calendar events (Ekadashi, Amavasya,
 * festivals, Purnima, etc.) pulled from the DB.
 *
 * Wired to: GET /api/admin/calendar/thisweek
 * Response shape: Array<{ date: string (YYYY-MM-DD), events: HinduCalendarEvent[] }>
 * Each event: { id, date, eventName, eventType, significance, isAuspicious }
 */
export default function CalendarWidget() {
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCalendarThisWeek()
      .then(setWeek)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Count how many days have at least one event
  const eventDays = week ? week.filter((d) => d.events.length > 0).length : 0;

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sectionLabel}>Hindu Calendar — Next 7 Days</span>
        <span style={styles.icon}>📅</span>
      </div>

      {loading && <p style={styles.muted}>Loading calendar…</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {week && (
        <>
          <p style={styles.summary}>
            {eventDays > 0
              ? `${eventDays} day${eventDays > 1 ? 's' : ''} with events this week`
              : 'No major events this week'}
          </p>

          <div style={styles.dayList}>
            {week.map((dayData) => (
              <DayRow key={dayData.date} dayData={dayData} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: one day row
// ---------------------------------------------------------------------------

function DayRow({ dayData }) {
  const { date, events } = dayData;
  const hasEvents = events.length > 0;

  // Format date label — e.g. "Mon 31 Mar"
  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Check if today
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const isToday = date === todayStr;

  return (
    <div
      style={{
        ...styles.dayRow,
        ...(isToday ? styles.dayRowToday : {}),
      }}
    >
      {/* Date column */}
      <div style={styles.dateCol}>
        <span
          style={{
            ...styles.dateLabel,
            ...(isToday ? styles.dateLabelToday : {}),
          }}
        >
          {dateLabel}
        </span>
        {isToday && <span style={styles.todayBadge}>Today</span>}
      </div>

      {/* Events column */}
      <div style={styles.eventsCol}>
        {!hasEvents ? (
          <span style={styles.noEvent}>—</span>
        ) : (
          events.map((ev) => (
            <EventChip key={ev.id} event={ev} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: event chip
// ---------------------------------------------------------------------------

function EventChip({ event }) {
  const typeEmoji = EVENT_TYPE_EMOJI[event.eventType] || '✨';
  const isAuspicious = event.isAuspicious;

  return (
    <div
      style={{
        ...styles.eventChip,
        borderColor: isAuspicious
          ? 'rgba(255, 215, 0, 0.35)'
          : 'rgba(255, 153, 51, 0.2)',
      }}
      title={event.significance || event.eventName}
    >
      <span>{typeEmoji}</span>
      <span style={styles.eventName}>{event.eventName}</span>
      {isAuspicious && <span style={styles.auspiciousDot} title="Auspicious" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPE_EMOJI = {
  ekadashi: '🌙',
  amavasya: '🌑',
  purnima: '🌕',
  festival: '🪔',
  vrat: '🙏',
  sankranti: '☀️',
  navratri: '🪷',
  default: '✨',
};

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
    marginBottom: '0.5rem',
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
  muted: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
  },
  errorText: {
    fontSize: '0.85rem',
    color: 'var(--color-error)',
  },
  summary: {
    fontSize: '0.83rem',
    color: 'var(--color-saffron)',
    marginBottom: '1rem',
  },
  dayList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  dayRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.875rem',
    padding: '0.6rem 0',
    borderBottom: '1px solid var(--color-border)',
  },
  dayRowToday: {
    background: 'rgba(255, 153, 51, 0.05)',
    borderRadius: '8px',
    padding: '0.6rem 0.5rem',
    borderBottom: '1px solid transparent',
    marginBottom: '2px',
  },
  dateCol: {
    minWidth: '80px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  dateLabel: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  dateLabelToday: {
    color: 'var(--color-gold)',
    fontWeight: 700,
  },
  todayBadge: {
    fontSize: '0.68rem',
    color: 'var(--color-saffron)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  eventsCol: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    flex: 1,
  },
  noEvent: {
    fontSize: '0.8rem',
    color: 'var(--color-border)',
  },
  eventChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    border: '1px solid',
    borderRadius: '14px',
    padding: '0.2rem 0.625rem',
    background: 'rgba(255,255,255,0.03)',
  },
  eventName: {
    fontSize: '0.8rem',
    color: 'var(--color-text-primary)',
  },
  auspiciousDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--color-gold)',
    flexShrink: 0,
  },
};
