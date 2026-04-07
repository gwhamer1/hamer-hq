import { CalendarEvent } from './types';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const KEY = 'hamer-calendar-events';

export async function getEvents(): Promise<CalendarEvent[]> {
  const response = await fetch(`${REDIS_URL}/get/${KEY}`, {
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Redis GET failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.result === null || data.result === undefined) {
    return [];
  }

  try {
    // Upstash stores the raw body bytes, so we parse once.
    // If the result is still a string after first parse (legacy double-encoded data),
    // parse again to get the actual array.
    let parsed = JSON.parse(data.result);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveEvents(events: CalendarEvent[]): Promise<void> {
  // Send the JSON array string as the body (single-encoded).
  // Upstash stores the raw body bytes, so data.result on GET will be the JSON array string.
  const response = await fetch(`${REDIS_URL}/set/${KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(events),
  });

  if (!response.ok) {
    throw new Error(`Redis SET failed: ${response.statusText}`);
  }
}
