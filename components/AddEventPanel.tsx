'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarEvent, CATEGORY_COLORS, Category } from '@/lib/types';

interface AddEventPanelProps {
  initialDate?: string;
  initialTime?: string;
  onAdd: (event: CalendarEvent) => void;
  onClose: () => void;
}

export default function AddEventPanel({ initialDate, initialTime, onAdd, onClose }: AddEventPanelProps) {
  const [text, setText] = useState('');
  const [overrideDate, setOverrideDate] = useState(initialDate || '');
  const [overrideTime, setOverrideTime] = useState(initialTime || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechSupported(supported);
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Build text with overrides if provided
      let inputText = text.trim();
      if (overrideDate) {
        inputText += ` on ${overrideDate}`;
      }
      if (overrideTime) {
        inputText += ` at ${overrideTime}`;
      }

      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!parseRes.ok) {
        throw new Error('Failed to parse event');
      }

      const parsed = await parseRes.json();

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      // Override date/time if user specified them
      if (overrideDate) parsed.date = overrideDate;
      if (overrideTime) parsed.time = overrideTime;

      const saveRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save event');
      }

      const savedEvent: CalendarEvent = await saveRes.json();
      onAdd(savedEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  const categories: { key: Category; label: string; color: string }[] = [
    { key: 'AIL', label: 'AIL', color: CATEGORY_COLORS.AIL },
    { key: 'SPS', label: 'SPS', color: CATEGORY_COLORS.SPS },
    { key: 'TPB', label: 'TPB', color: CATEGORY_COLORS.TPB },
    { key: 'Personal', label: 'Personal', color: CATEGORY_COLORS.Personal },
  ];

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
            <h2 className="text-lg font-bold text-white">Add Event</h2>
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

          {/* Category pills legend */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {categories.map((cat) => (
              <span
                key={cat.key}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` }}
              >
                {cat.label}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Natural language input */}
            <div className="relative mb-3">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. "Pickleball Tuesday 2pm" or "SPS quote with Rod Thursday 9am"'
                className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-gray-500 text-sm transition-colors"
                style={{
                  backgroundColor: '#0f0f1a',
                  border: '1px solid #3a3a5c',
                }}
                disabled={loading || listening}
              />

              {/* Voice button */}
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

            {/* Date/Time overrides */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Date override</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-white text-sm"
                  style={{
                    backgroundColor: '#0f0f1a',
                    border: '1px solid #3a3a5c',
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Time override</label>
                <input
                  type="time"
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-white text-sm"
                  style={{
                    backgroundColor: '#0f0f1a',
                    border: '1px solid #3a3a5c',
                    colorScheme: 'dark',
                  }}
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
        </div>
      </div>
    </div>
  );
}
