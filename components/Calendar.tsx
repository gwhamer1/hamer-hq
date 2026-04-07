'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/lib/types';
import WeekView from './WeekView';
import MonthView from './MonthView';
import AgendaView from './AgendaView';
import EventModal from './EventModal';
import AddEventPanel from './AddEventPanel';

type ViewType = 'week' | 'month' | 'agenda';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getWeekRange(date: Date): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  if (start.getMonth() === end.getMonth()) {
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

export default function Calendar() {
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addPanelInitialDate, setAddPanelInitialDate] = useState<string | undefined>();
  const [addPanelInitialTime, setAddPanelInitialTime] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    // Poll for new events every 30 seconds
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  function navigate(direction: 1 | -1) {
    const d = new Date(currentDate);
    if (view === 'week') {
      d.setDate(d.getDate() + direction * 7);
    } else if (view === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else {
      d.setDate(d.getDate() + direction * 7);
    }
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function openAddPanel(date?: string, time?: string) {
    setAddPanelInitialDate(date);
    setAddPanelInitialTime(time);
    setShowAddPanel(true);
  }

  function handleEventAdded(event: CalendarEvent) {
    setEvents((prev) => [...prev, event]);
    setShowAddPanel(false);
  }

  async function handleDeleteEvent(id: string) {
    try {
      const res = await fetch('/api/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  }

  function getHeaderTitle(): string {
    if (view === 'week') return getWeekRange(currentDate);
    if (view === 'month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    return 'Upcoming';
  }

  const viewButtons: { key: ViewType; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'agenda', label: 'Agenda' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: 'rgba(15,15,26,0.95)',
          borderBottom: '1px solid #2a2a45',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#3d9fff22', border: '1px solid #3d9fff44' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d9fff" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight hidden sm:block">Hamer HQ</h1>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: '#8888aa' }}
            aria-label="Previous"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: '#8888aa' }}
            aria-label="Next"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ml-1"
            style={{
              backgroundColor: '#2a2a45',
              color: '#e8e8f0',
              border: '1px solid #3a3a5c',
            }}
          >
            Today
          </button>
        </div>

        {/* Date title */}
        <div className="flex-1 text-center">
          <h2 className="text-sm font-semibold text-white hidden sm:block">{getHeaderTitle()}</h2>
        </div>

        {/* View switcher */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a45' }}
        >
          {viewButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className="px-3 py-1.5 text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: view === key ? '#3d9fff' : 'transparent',
                color: view === key ? '#fff' : '#8888aa',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button
          onClick={() => { setLoading(true); fetchEvents(); }}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: loading ? '#3d9fff' : '#8888aa' }}
          aria-label="Refresh"
          title="Refresh"
        >
          <svg className={loading ? 'animate-spin' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {view === 'week' && (
          <WeekView
            events={events}
            currentDate={currentDate}
            onEventClick={setSelectedEvent}
            onTimeSlotClick={(date, time) => openAddPanel(date, time)}
          />
        )}
        {view === 'month' && (
          <MonthView
            events={events}
            currentDate={currentDate}
            onEventClick={setSelectedEvent}
            onDayClick={(date) => openAddPanel(date)}
          />
        )}
        {view === 'agenda' && (
          <AgendaView
            events={events}
            onEventClick={setSelectedEvent}
          />
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => openAddPanel()}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          backgroundColor: '#3d9fff',
          boxShadow: '0 4px 24px rgba(61,159,255,0.4)',
        }}
        aria-label="Add event"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Event Modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Add Event Panel */}
      {showAddPanel && (
        <AddEventPanel
          initialDate={addPanelInitialDate}
          initialTime={addPanelInitialTime}
          onAdd={handleEventAdded}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}
