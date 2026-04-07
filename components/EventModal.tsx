'use client';

import { CalendarEvent, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';

interface EventModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function formatTime(time: string): string {
  const [hourStr, minute] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function EventModal({ event, onClose, onDelete }: EventModalProps) {
  const color = CATEGORY_COLORS[event.category];
  const label = CATEGORY_LABELS[event.category];

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleDelete() {
    if (confirm(`Delete "${event.title}"?`)) {
      onDelete(event.id);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="animate-scale-in w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a45' }}
      >
        {/* Color accent bar */}
        <div style={{ height: '4px', backgroundColor: color }} />

        <div className="p-6">
          {/* Category badge */}
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
              style={{ backgroundColor: `${color}22`, color: color, border: `1px solid ${color}44` }}
            >
              {event.category} — {label}
            </span>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/5"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-4 leading-tight">{event.title}</h2>

          {/* Date */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2a2a45' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="text-gray-200">{formatDate(event.date)}</span>
          </div>

          {/* Time */}
          {event.time && (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2a2a45' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="text-gray-200">
                {formatTime(event.time)}
                {event.endTime && ` – ${formatTime(event.endTime)}`}
              </span>
            </div>
          )}

          {/* Note */}
          {event.note && (
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5" style={{ backgroundColor: '#2a2a45' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{event.note}</p>
            </div>
          )}

          {/* Delete button */}
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid #2a2a45' }}>
            <button
              onClick={handleDelete}
              className="w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#ff3b30', color: '#fff' }}
            >
              Delete Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
