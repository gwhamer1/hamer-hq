'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarEvent, CATEGORY_COLORS, Category, Owner } from '@/lib/types';

interface AddEventPanelProps {
  initialDate?: string;
  initialTime?: string;
  editEvent?: CalendarEvent;
  onAdd: (event: CalendarEvent) => void;
  onUpdate?: (event: CalendarEvent) => void;
  onClose: () => void;
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'AIL', label: 'AIL' },
  { key: 'SPS', label: 'SPS' },
  { key: 'TPB', label: 'TPB' },
  { key: 'Personal', label: 'Personal' },
];

export default function AddEventPanel({
  initialDate,
  initialTime,
  editEvent,
  onAdd,
  onUpdate,
  onClose,
}: AddEventPanelProps) {
  const isEditMode = !!editEvent;

  // Add-mode state
  const [text, setText] = useState('');
  const [overrideDate, setOverrideDate] = useState(initialDate || '');
  const [overrideTime, setOverrideTime] = useState(initialTime || '');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Edit-mode state (pre-filled from editEvent)
  const [editTitle, setEditTitle] = useState(editEvent?.title || '');
  const [editDate, setEditDate] = useState(editEvent?.date || '');
  const [editTime, setEditTime] = useState(editEvent?.time || '');
  const [editEndTime, setEditEndTime] = useState(editEvent?.endTime || '');
  const [editCategory, setEditCategory] = useState<Category>(editEvent?.category || 'Personal');
  const [editOwner, setEditOwner] = useState<Owner | ''>(editEvent?.owner || '');
  const [editNote, setEditNote] = useState(editEvent?.note || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditMode) {
      inputRef.current?.focus();
      const supported =
        typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
      setSpeechSupported(supported);
    }
  }, [isEditMode]);

  function startListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'en-CA';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      setListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');

    try {
      let inputText = text.trim();
      if (overrideDate) inputText += ` on ${overrideDate}`;
      if (overrideTime) inputText += ` at ${overrideTime}`;

      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      if (!parseRes.ok) throw new Error('Failed to parse event');
      const parsed = await parseRes.json();
      if (parsed.error) throw new Error(parsed.error);

      if (overrideDate) parsed.date = overrideDate;
      if (overrideTime) parsed.time = overrideTime;

      const saveRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!saveRes.ok) throw new Error('Failed to save event');

      const savedEvent: CalendarEvent = await saveRes.json();
      onAdd(savedEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim() || !editDate) return;
    setLoading(true);
    setError('');

    try {
      const payload: Partial<CalendarEvent> = {
        title: editTitle.trim(),
        date: editDate,
        category: editCategory,
        ...(editOwner && { owner: editOwner }),
        ...(editTime && { time: editTime }),
        ...(editEndTime && { endTime: editEndTime }),
        ...(editNote.trim() && { note: editNote.trim() }),
      };

      const res = await fetch(`/api/events?id=${editEvent!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update event');

      const updated: CalendarEvent = await res.json();
      onUpdate?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="animate-slide-up w-full max-w-lg rounded-t-3xl shadow-2xl pb-safe"
        style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a45', borderBottom: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#3a3a5c' }} />
        </div>

        <div className="px-6 pt-3 pb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">
              {isEditMode ? 'Edit Event' : 'Add Event'}
            </h2>
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

          {isEditMode ? (
            /* ── Edit mode: structured fields ── */
            <form onSubmit={handleEditSubmit}>
              {/* Title */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Event title"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm"
                  style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c' }}
                  required
                  disabled={loading}
                />
              </div>

              {/* Date / Start / End */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm"
                    style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c', colorScheme: 'dark' }}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Start</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm"
                    style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c', colorScheme: 'dark' }}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">End</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm"
                    style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c', colorScheme: 'dark' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Category</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => {
                    const color = CATEGORY_COLORS[cat.key];
                    const selected = editCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setEditCategory(cat.key)}
                        className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                        style={{
                          backgroundColor: selected ? color : `${color}22`,
                          color: selected ? '#fff' : color,
                          border: `1px solid ${selected ? color : `${color}44`}`,
                        }}
                        disabled={loading}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Owner */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Owner</label>
                <div className="flex gap-2">
                  {(['Gary', 'Andrea', ''] as const).map((o) => (
                    <button
                      key={o === '' ? 'none' : o}
                      type="button"
                      onClick={() => setEditOwner(o)}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                      style={{
                        backgroundColor: editOwner === o ? '#3d9fff' : '#3d9fff22',
                        color: editOwner === o ? '#fff' : '#3d9fff',
                        border: `1px solid ${editOwner === o ? '#3d9fff' : '#3d9fff44'}`,
                      }}
                      disabled={loading}
                    >
                      {o === '' ? 'None' : o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Note</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Optional note..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm resize-none"
                  style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c' }}
                  disabled={loading}
                />
              </div>

              {error && (
                <div
                  className="mb-3 px-4 py-3 rounded-xl text-sm"
                  style={{ backgroundColor: 'rgba(255,59,48,0.12)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.25)' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !editTitle.trim() || !editDate}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#3d9fff', color: '#fff' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ── Add mode: natural language + voice ── */
            <form onSubmit={handleAddSubmit}>
              {/* Category pills legend */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {CATEGORIES.map((cat) => {
                  const color = CATEGORY_COLORS[cat.key];
                  return (
                    <span
                      key={cat.key}
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
                    >
                      {cat.label}
                    </span>
                  );
                })}
              </div>

              {/* Natural language input */}
              <div className="relative mb-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder='e.g. "Pickleball Tuesday 2pm" or "SPS quote with Rod Thursday 9am"'
                  className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-gray-500 text-sm transition-colors"
                  style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c' }}
                  disabled={loading || listening}
                />

                {speechSupported && (
                  <button
                    type="button"
                    onClick={listening ? stopListening : startListening}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all"
                    style={{
                      color: listening ? '#ff6b4a' : '#8888aa',
                      backgroundColor: listening ? 'rgba(255,107,74,0.15)' : 'transparent',
                    }}
                    aria-label={listening ? 'Stop listening' : 'Start voice input'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={listening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                )}
              </div>

              {listening && (
                <p className="text-sm mb-3 flex items-center gap-2" style={{ color: '#ff6b4a' }}>
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#ff6b4a' }} />
                  Listening... speak now
                </p>
              )}

              {/* Date / Time overrides */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Date override</label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm"
                    style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c', colorScheme: 'dark' }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Time override</label>
                  <input
                    type="time"
                    value={overrideTime}
                    onChange={(e) => setOverrideTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm"
                    style={{ backgroundColor: '#0f0f1a', border: '1px solid #3a3a5c', colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {error && (
                <div
                  className="mb-3 px-4 py-3 rounded-xl text-sm"
                  style={{ backgroundColor: 'rgba(255,59,48,0.12)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.25)' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#3d9fff', color: '#fff' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Parsing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Event
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
