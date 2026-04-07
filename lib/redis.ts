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

  if (!data.result) {
    return [];
  }

  try {
    const parsed = JSON.parse(data.result);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveEvents(events: CalendarEvent[]): Promise<void> {
  const response = await fetch(`${REDIS_URL}/set/${KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(events)),
  });

  if (!response.ok) {
    throw new Error(`Redis SET failed: ${response.statusText}`);
  }
}
