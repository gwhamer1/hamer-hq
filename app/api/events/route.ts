import { NextRequest, NextResponse } from 'next/server';
import { getEvents, saveEvents } from '@/lib/redis';
import { CalendarEvent } from '@/lib/types';

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = await getEvents();

    const newEvent: CalendarEvent = {
      ...body,
      id: crypto.randomUUID(),
    };

    events.push(newEvent);
    await saveEvents(events);

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('POST /api/events error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const events = await getEvents();
    const filtered = events.filter((e: CalendarEvent) => e.id !== id);

    if (filtered.length === events.length) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await saveEvents(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/events error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
