'use client';

import { CalendarEvent, CATEGORY_COLORS } from '@/lib/types';

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getMonthGrid(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const grid: (Date | null)[] = [];

  // Pad start
  for (let i = 0; i < firstDay.getDay(); i++) {
    grid.push(null);
  }

  // Month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push(new Date(year, month, d));
  }

  // Pad end to complete grid (6 rows × 7 cols = 42)
  while (grid.length < 42) {
    grid.push(null);
  }

  return grid;
}

export default function MonthView({ events, currentDate, onEventClick, onDayClick }: MonthViewProps) {
  const grid = getMonthGrid(currentDate);

  function getEventsForDay(date: Date): CalendarEvent[] {
    const dateStr = formatDateStr(date);
    return events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => {
        if (!a.time) return -1;
        if (!b.time) return 1;
        return a.time.localeCompare(b.time);
      });
  }

  return (
    <div style={{ backgroundColor: '#0f0f1a' }}>
      {/* Day headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid #2a2a45' }}>
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#8888aa' }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {grid.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                style={{
                  minHeight: '100px',
                  borderBottom: '1px solid #2a2a45',
                  borderRight: index % 7 !== 6 ? '1px solid #2a2a45' : 'none',
                  backgroundColor: '#0a0a14',
                }}
              />
            );
          }

          const dayEvents = getEventsForDay(day);
          const today = isToday(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const dateStr = formatDateStr(day);
          const visibleEvents = dayEvents.slice(0, 3);
          const overflowCount = dayEvents.length - 3;

          return (
            <div
              key={dateStr}
              className="cursor-pointer transition-colors"
              style={{
                minHeight: '100px',
                borderBottom: '1px solid #2a2a45',
                borderRight: index % 7 !== 6 ? '1px solid #2a2a45' : 'none',
                padding: '6px',
                backgroundColor: today ? 'rgba(61,159,255,0.05)' : 'transparent',
                opacity: isCurrentMonth ? 1 : 0.4,
              }}
              onClick={() => onDayClick(dateStr)}
            >
              {/* Day number */}
              <div className="flex justify-center mb-1">
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    color: today ? '#fff' : '#e8e8f0',
                    backgroundColor: today ? '#3d9fff' : 'transparent',
                  }}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {visibleEvents.map((event) => {
                  const color = CATEGORY_COLORS[event.category];
                  return (
                    <div
                      key={event.id}
                      className="event-chip"
                      style={{
                        backgroundColor: `${color}25`,
                        borderLeft: `3px solid ${color}`,
                        color: color,
                        padding: '1px 4px',
                        borderRadius: '2px',
                        fontSize: '10px',
                        fontWeight: 500,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      title={event.title}
                    >
                      {event.time ? `${event.time} ` : ''}{event.title}
                    </div>
                  );
                })}

                {overflowCount > 0 && (
                  <div
                    className="text-xs pl-1 font-medium"
                    style={{ color: '#8888aa' }}
                  >
                    +{overflowCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
