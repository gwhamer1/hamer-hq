'use client';

import { CalendarEvent, CATEGORY_COLORS } from '@/lib/types';

interface WeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: string, time: string) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDays(date: Date): Date[] {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

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

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function WeekView({ events, currentDate, onEventClick, onTimeSlotClick }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const HOUR_HEIGHT = 60; // px per hour
  const START_HOUR = 6;

  function getEventsForDay(dateStr: string) {
    return events.filter((e) => e.date === dateStr);
  }

  function getEventStyle(event: CalendarEvent): React.CSSProperties {
    const color = CATEGORY_COLORS[event.category];

    if (!event.time) {
      return {
        backgroundColor: `${color}33`,
        borderLeft: `3px solid ${color}`,
        color: color,
        position: 'relative',
        top: 0,
        left: 0,
        right: 0,
        height: 'auto',
        marginBottom: '2px',
      };
    }

    const startMinutes = timeToMinutes(event.time);
    const endMinutes = event.endTime ? timeToMinutes(event.endTime) : startMinutes + 60;
    const topOffset = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 20);

    return {
      position: 'absolute',
      top: `${topOffset}px`,
      left: '2px',
      right: '2px',
      height: `${height}px`,
      backgroundColor: `${color}33`,
      borderLeft: `3px solid ${color}`,
      color: color,
      zIndex: 10,
    };
  }

  return (
    <div className="flex flex-col" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Day headers */}
      <div className="flex" style={{ borderBottom: '1px solid #2a2a45' }}>
        {/* Time gutter */}
        <div style={{ width: '56px', flexShrink: 0 }} />

        {weekDays.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              className="flex-1 text-center py-2 flex flex-col items-center"
              style={{ borderLeft: '1px solid #2a2a45' }}
            >
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: today ? '#3d9fff' : '#8888aa' }}
              >
                {DAY_NAMES[day.getDay()]}
              </span>
              <span
                className="text-lg font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full"
                style={{
                  color: today ? '#fff' : '#e8e8f0',
                  backgroundColor: today ? '#3d9fff' : 'transparent',
                }}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      <div className="flex" style={{ borderBottom: '1px solid #2a2a45', minHeight: '28px' }}>
        <div
          style={{ width: '56px', flexShrink: 0 }}
          className="flex items-center justify-end pr-2"
        >
          <span className="text-xs" style={{ color: '#8888aa' }}>all-day</span>
        </div>
        {weekDays.map((day, i) => {
          const dateStr = formatDateStr(day);
          const allDayEvents = getEventsForDay(dateStr).filter((e) => !e.time);
          return (
            <div
              key={i}
              className="flex-1 px-0.5 py-0.5"
              style={{ borderLeft: '1px solid #2a2a45' }}
            >
              {allDayEvents.map((event) => {
                const color = CATEGORY_COLORS[event.category];
                return (
                  <div
                    key={event.id}
                    className="event-chip text-xs mb-0.5 cursor-pointer"
                    style={{
                      backgroundColor: `${color}33`,
                      borderLeft: `3px solid ${color}`,
                      color: color,
                      padding: '1px 4px',
                      borderRadius: '2px',
                    }}
                    onClick={() => onEventClick(event)}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Time labels */}
        <div style={{ width: '56px', flexShrink: 0 }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              style={{
                height: `${HOUR_HEIGHT}px`,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                paddingRight: '8px',
                paddingTop: '2px',
              }}
            >
              <span className="text-xs" style={{ color: '#8888aa', fontSize: '11px' }}>
                {formatHour(hour)}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, dayIndex) => {
          const dateStr = formatDateStr(day);
          const timedEvents = getEventsForDay(dateStr).filter((e) => e.time);

          return (
            <div
              key={dayIndex}
              className="flex-1 relative"
              style={{
                borderLeft: '1px solid #2a2a45',
                height: `${HOURS.length * HOUR_HEIGHT}px`,
              }}
            >
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{
                    position: 'absolute',
                    top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`,
                    left: 0,
                    right: 0,
                    height: `${HOUR_HEIGHT}px`,
                    borderTop: '1px solid #2a2a45',
                  }}
                >
                  {/* Half-hour line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${HOUR_HEIGHT / 2}px`,
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed rgba(42,42,69,0.6)',
                    }}
                  />

                  {/* Clickable time slot */}
                  <div
                    className="absolute inset-0 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => {
                      const timeStr = `${String(hour).padStart(2, '0')}:00`;
                      onTimeSlotClick(dateStr, timeStr);
                    }}
                  />
                </div>
              ))}

              {/* Timed events */}
              {timedEvents.map((event) => {
                const style = getEventStyle(event);
                return (
                  <div
                    key={event.id}
                    className="event-chip"
                    style={{
                      ...style,
                      borderRadius: '4px',
                      padding: '3px 6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}
                    onClick={() => onEventClick(event)}
                    title={event.title}
                  >
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.title}
                    </div>
                    {event.time && (
                      <div style={{ opacity: 0.8, fontSize: '10px' }}>{event.time}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
