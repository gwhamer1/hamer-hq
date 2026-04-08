'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarEvent, CATEGORY_COLORS, Category, Owner } from '@/lib/types';

interface ParsedResult {
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  category: Category;
  owner?: Owner;
  note?: string;
}

interface VoiceRecorderProps {
  initialDate?: string;
  initialTime?: string;
  onEventSaved: (event: CalendarEvent) => void;
  onClose: () => void;
}

function formatConfirmDate(date: string, time?: string): string {
  const d = new Date(date + 'T12:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  let str = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'pm' : 'am';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    str += ` at ${hour}${m ? ':' + String(m).padStart(2, '0') : ''}${period}`;
  }
  return str;
}

export default function VoiceRecorder({ initialDate, initialTime, onEventSaved, onClose }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<'recording' | 'parsing' | 'confirm' | 'error'>('recording');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const recognitionRef = useRef<unknown>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef('');
  const hasSubmittedRef = useRef(false);
  // Use a ref to hold the current submit function so recognition callbacks always see latest version
  const submitRef = useRef<(text: string) => Promise<void>>(async () => {});
  const stopAndSubmitRef = useRef<() => void>(() => {});
  const startRef = useRef<() => void>(() => {});

  // Wire up submit
  submitRef.current = async (text: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    if (!text.trim()) {
      setError('No speech detected. Please try again.');
      setPhase('error');
      return;
    }

    setPhase('parsing');

    try {
      let inputText = text.trim();
      if (initialDate) inputText += ` on ${initialDate}`;
      if (initialTime) inputText += ` at ${initialTime}`;

      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) throw new Error('Failed to parse event');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (initialDate) data.date = initialDate;
      if (initialTime) data.time = initialTime;

      setParsed(data);
      setPhase('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse event');
      setPhase('error');
    }
  };

  stopAndSubmitRef.current = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognitionRef.current as any)?.stop();
    submitRef.current(finalTranscriptRef.current);
  };

  startRef.current = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setError('Voice input is not supported in this browser. Please use Chrome or Edge.');
      setPhase('error');
      return;
    }

    hasSubmittedRef.current = false;
    finalTranscriptRef.current = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognitionClass() as any;
    recognition.lang = 'en-CA';
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current +=
            (finalTranscriptRef.current ? ' ' : '') + event.results[i][0].transcript;
          setTranscript(finalTranscriptRef.current);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimText(interim);

      // Reset silence timer — auto-submit after 2s of silence
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        stopAndSubmitRef.current();
      }, 2000);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        stopAndSubmitRef.current();
      } else if (event.error !== 'aborted') {
        setError(`Voice error: ${event.error}`);
        setPhase('error');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    startRef.current();
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any)?.abort();
    };
  }, []);

  function handleRedo() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognitionRef.current as any)?.abort();
    setPhase('recording');
    setTranscript('');
    setInterimText('');
    setParsed(null);
    setError('');
    setSaving(false);
    setTimeout(() => startRef.current(), 150);
  }

  async function handleConfirm() {
    if (!parsed) return;
    setSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error('Failed to save event');
      const savedEvent: CalendarEvent = await res.json();
      onEventSaved(savedEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
      setPhase('error');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-slide-up w-full max-w-lg rounded-t-3xl shadow-2xl pb-safe"
        style={{
          backgroundColor: '#1a1a2e',
          border: '1px solid #2a2a45',
          borderBottom: 'none',
          minHeight: '360px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#3a3a5c' }} />
        </div>

        <div className="px-6 pt-4 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">
              {phase === 'recording' && 'Listening\u2026'}
              {phase === 'parsing' && 'Understanding\u2026'}
              {phase === 'confirm' && 'Confirm Event'}
              {phase === 'error' && 'Something went wrong'}
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

          {/* Recording phase */}
          {phase === 'recording' && (
            <div className="flex flex-col items-center gap-6 py-2">
              {/* Pulsing mic icon */}
              <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: 'rgba(255,59,48,0.25)' }}
                />
                <div
                  className="absolute inset-2 rounded-full animate-pulse"
                  style={{ backgroundColor: 'rgba(255,59,48,0.15)' }}
                />
                <div
                  className="relative w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,59,48,0.12)', border: '2px solid rgba(255,59,48,0.6)' }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#ff3b30" stroke="#ff3b30" strokeWidth="1">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth="1.5" />
                    <line x1="12" y1="19" x2="12" y2="23" strokeWidth="1.5" />
                    <line x1="8" y1="23" x2="16" y2="23" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              {/* Live transcript */}
              <div className="w-full min-h-14 text-center px-2">
                {transcript || interimText ? (
                  <p className="text-white text-base leading-relaxed">
                    {transcript}
                    {interimText && (
                      <span style={{ color: '#8888aa' }}>{transcript ? ' ' : ''}{interimText}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: '#8888aa' }}>
                    Speak now\u2026 auto-submits after 2 seconds of silence
                  </p>
                )}
              </div>

              <button
                onClick={() => stopAndSubmitRef.current()}
                className="px-6 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: '#2a2a45', color: '#e8e8f0', border: '1px solid #3a3a5c' }}
              >
                Done Speaking
              </button>
            </div>
          )}

          {/* Parsing phase */}
          {phase === 'parsing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg
                className="animate-spin"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3d9fff"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <p className="text-sm" style={{ color: '#8888aa' }}>
                Parsing your event\u2026
              </p>
              {transcript && (
                <p className="text-sm text-center opacity-60 text-white px-4">
                  &ldquo;{transcript}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Confirm phase */}
          {phase === 'confirm' && parsed && (
            <div className="flex flex-col gap-5">
              {/* Confirmation card */}
              <div
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: '#0f0f1a',
                  border: `2px solid ${CATEGORY_COLORS[parsed.category]}44`,
                }}
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[parsed.category]}22`,
                      color: CATEGORY_COLORS[parsed.category],
                      border: `1px solid ${CATEGORY_COLORS[parsed.category]}55`,
                    }}
                  >
                    {parsed.category}
                  </span>
                  {parsed.owner && (
                    <span className="text-xs font-semibold" style={{ color: '#8888aa' }}>
                      for {parsed.owner}
                    </span>
                  )}
                </div>
                <p className="text-white font-semibold text-base mb-1.5 leading-snug">
                  {parsed.title}
                </p>
                <p className="text-sm" style={{ color: '#8888aa' }}>
                  {formatConfirmDate(parsed.date, parsed.time)}
                  {parsed.endTime && (
                    <span>
                      {' \u2013 '}
                      {(() => {
                        const [h, m] = parsed.endTime.split(':').map(Number);
                        const period = h >= 12 ? 'pm' : 'am';
                        const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        return `${hour}${m ? ':' + String(m).padStart(2, '0') : ''}${period}`;
                      })()}
                    </span>
                  )}
                </p>
                {parsed.note && (
                  <p className="text-xs mt-2" style={{ color: '#6668aa' }}>
                    {parsed.note}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRedo}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ backgroundColor: '#2a2a45', color: '#e8e8f0', border: '1px solid #3a3a5c' }}
                >
                  Redo
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#3d9fff', color: '#fff' }}
                >
                  {saving ? (
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* Error phase */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: 'rgba(255,59,48,0.12)',
                  color: '#ff3b30',
                  border: '1px solid rgba(255,59,48,0.25)',
                }}
              >
                {error}
              </div>
              <button
                onClick={handleRedo}
                className="px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#3d9fff', color: '#fff' }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
