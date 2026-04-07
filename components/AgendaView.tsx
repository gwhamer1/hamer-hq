'use client';

import { CalendarEvent, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';

interface AgendaViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

function formatTime(time: string): string {
  const [hourStr, minute] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) {
    return `Today — ${date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}`;
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  if (dateStr === tomorrowStr) {
    return `Tomorrow — ${date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}`;
  }

  return date.toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getNext60Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

export default function AgendaView({ events, onEventClick }: AgendaViewProps) {
  const next60 = getNext60Days();

  const grouped: { date: string; events: CalendarEvent[] }[] = next60
    .map((date) => ({
      date,
      events: events
        .filter((e) => e.date === date)
        .sort((a, b) => {
          if (!a.time) return -1;
          if (!b.time) return 1;
          return a.time.localeCompare(b.time);
        }),
    }))
    .filter((g) => g.events.length > 0);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24" style={{ color: '#8888aa' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p className="text-lg font-medium">No upcoming events</p>
        <p className="text-sm mt-1 opacity-70">Add events using the + button below</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {grouped.map(({ date, events: dayEvents }) => (
        <div key={date} className="mb-6">
          {/* Date header */}
          <div
            className="sticky top-0 py-2 mb-2"
            style={{ backgroundColor: '#0f0f1a', zIndex: 10 }}
          >
            <div className="flex items-center gap-3">
              <div className="h-px flex-1" style={{ backgroundColor: '#2a2a45' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
                {formatDateHeader(date)}
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: '#2a2a45' }} />
            </div>
          </div>

          {/* Events */}
          <div className="space-y-2">
            {dayEvents.map((event) => {
              const color = CATEGORY_COLORS[event.category];
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 hover:scale-[1.01]"
                  style={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #2a2a45',
                    borderLeft: `4px solid ${color}`,
                  }}
                  onClick={() => onEventClick(event)}
                >
                  {/* Time */}
                  <div style={{ minWidth: '64px' }}>
                    {event.time ? (
                      <span className="text-sm font-semibold" style={{ color }}>
                        {formatTime(event.time)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium" style={{ color: '#8888aa' }}>
                        All day
                      </span>
                    )}
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white text-sm leading-tight">{event.title}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: `${color}22`,
                          color: color,
                          border: `1px solid ${color}44`,
                        }}
                      >
                        {event.category}
                      </span>
                    </div>
                    {event.endTime && event.time && (
                      <p className="text-xs mt-0.5" style={{ color: '#8888aa' }}>
                        until {formatTime(event.endTime)}
                      </p>
                    )}
                    {event.note && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: '#8888aa' }}>
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
