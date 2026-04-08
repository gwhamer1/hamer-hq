'use client';

import { useRef, useEffect } from 'react';
import { CalendarEvent, CATEGORY_COLORS } from '@/lib/types';

const HOUR_HEIGHT = 64; // px per hour
const LABEL_WIDTH = 60; // px for hour labels column
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatEventTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}${m ? ':' + String(m).padStart(2, '0') : ''}${period}`;
}

function dateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface DayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: string, time: string) => void;
}

export default function DayView({ events, currentDate, onEventClick, onTimeSlotClick }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateStr = dateToString(currentDate);

  const now = new Date();
  const todayStr = dateToString(now);
  const isToday = dateStr === todayStr;
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  const dayEvents = events.filter((e) => e.date === dateStr);
  const timedEvents = dayEvents.filter((e) => e.time);
  const allDayEvents = dayEvents.filter((e) => !e.time);

  // Scroll to 1 hour before current time (or 8am if not today)
  useEffect(() => {
    if (scrollRef.current) {
      const targetHour = isToday ? Math.max(0, now.getHours() - 1) : 8;
      scrollRef.current.scrollTop = targetHour * HOUR_HEIGHT;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  function handleTimeSlotClick(e: React.MouseEvent<HTMLDivElement>, hour: number) {
    // Make sure click is on the empty area, not an event
    if ((e.target as HTMLElement).closest('button[data-event]')) return;
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    onTimeSlotClick(dateStr, timeStr);
  }

  return (
    <div className="flex flex-col h-full" style={{ color: '#e8e8f0' }}>
      {/* All-day events strip */}
      {allDayEvents.length > 0 && (
        <div
          className="flex-shrink-0 px-4 py-2"
          style={{ borderBottom: '1px solid #2a2a45' }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-medium flex-shrink-0"
              style={{ color: '#8888aa', width: `${LABEL_WIDTH}px` }}
            >
              All day
            </span>
            {allDayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="text-xs px-2 py-1 rounded-lg font-medium text-white truncate max-w-xs transition-all hover:brightness-110"
                style={{ backgroundColor: CATEGORY_COLORS[event.category] }}
              >
                {event.title}
                {event.owner && (
                  <span className="opacity-75"> &middot; {event.owner}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable 24-hour timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Hour rows (click targets + labels) */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex cursor-pointer transition-colors hover:bg-white/[0.015]"
              style={{
                top: hour * HOUR_HEIGHT,
                height: HOUR_HEIGHT,
                borderTop: '1px solid #2a2a4533',
              }}
              onClick={(e) => handleTimeSlotClick(e, hour)}
            >
              {/* Hour label */}
              <div
                className="flex-shrink-0 flex items-start justify-end pr-3 pt-1"
                style={{ width: `${LABEL_WIDTH}px` }}
              >
                <span
                  className="text-xs font-medium select-none"
                  style={{ color: '#8888aa', fontSize: '0.65rem' }}
                >
                  {hour === 0 ? '' : formatHourLabel(hour)}
                </span>
              </div>
              {/* Right column (event area) */}
              <div className="flex-1" style={{ borderLeft: '1px solid #2a2a4566' }} />
            </div>
          ))}

          {/* Current time red line */}
          {isToday && (
            <div
              className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
              style={{ top: (currentTotalMinutes / 60) * HOUR_HEIGHT }}
            >
              <div className="flex-shrink-0" style={{ width: `${LABEL_WIDTH - 4}px` }} />
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#ff3b30', marginLeft: '-5px' }}
              />
              <div className="flex-1 h-px" style={{ backgroundColor: '#ff3b30' }} />
            </div>
          )}

          {/* Timed events */}
          {timedEvents.map((event) => {
            const startMin = timeToMinutes(event.time!);
            const endMin = event.endTime ? timeToMinutes(event.endTime) : startMin + 60;
            const top = (startMin / 60) * HOUR_HEIGHT;
            const height = Math.max(28, ((endMin - startMin) / 60) * HOUR_HEIGHT) - 4;
            const color = CATEGORY_COLORS[event.category];

            return (
              <button
                key={event.id}
                data-event="true"
                onClick={() => onEventClick(event)}
                className="absolute z-20 rounded-lg text-left overflow-hidden transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  top: top + 2,
                  height,
                  left: `${LABEL_WIDTH + 4}px`,
                  right: '8px',
                  backgroundColor: `${color}1a`,
                  border: `1px solid ${color}55`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="px-2 py-1">
                  <p className="text-xs font-semibold leading-tight truncate" style={{ color: '#e8e8f0' }}>
                    {event.title}
                  </p>
                  {height > 38 && (
                    <p className="text-xs truncate mt-0.5" style={{ color: '#8888aa', fontSize: '0.65rem' }}>
                      {formatEventTime(event.time!)}
                      {event.endTime && ` \u2013 ${formatEventTime(event.endTime)}`}
                      {event.owner && ` \u00b7 ${event.owner}`}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
