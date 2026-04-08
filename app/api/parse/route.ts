import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a calendar assistant for a family business calendar called Hamer HQ. The calendar is shared between Gary and Andrea Hamer. Parse the user's natural language input and return a JSON object with these fields:
- title (string, required): concise event title
- date (string, required): YYYY-MM-DD format. If no year given assume 2025 or 2026 as appropriate based on context. Today is ${today}.
- time (string, optional): HH:MM in 24-hour format
- endTime (string, optional): HH:MM in 24-hour format
- category (string, required): one of "AIL", "SPS", "TPB", "Personal"
- owner (string, optional): "Gary" or "Andrea" — who this event belongs to
- note (string, optional): any additional details

Owner detection rules (spoken voice format):
- "This is for Gary" or "for Gary" or "Gary," at the start → owner: "Gary"
- "This is for Andrea" or "for Andrea" or "Andrea," at the start → owner: "Andrea"
- If unclear or not mentioned, omit owner field

Category detection rules (category is often spoken explicitly at the start):
- AIL (Adventuring Into Life): spoken "AIL" OR keywords like adventuring, cycling, camp, program, Kamloops, Vernon, Kelowna, Valemount, Andrea's business
- SPS (Sustainable Paving Stones): spoken "SPS" OR keywords like paving, stones, asphalt, blacktop, enduro, Gary Wilson, Rod, David, franchise, brick
- TPB (The Pickleball Body): spoken "TPB" OR keywords like pickleball, kitchen test, ankle, mobility, protocol, court, player
- Personal: everything else — dentist, family, kids, personal, home, groceries, travel, default

Voice input often follows this pattern: "[owner], [category], [description], [date] [time]"
Examples:
- "This is for Gary, SPS, meeting with Gary Wilson on Friday at 2pm" → owner:"Gary", category:"SPS", title:"Meeting with Gary Wilson", date: next Friday, time:"14:00"
- "Andrea, AIL, Kelowna cycling camp registration, next Monday 9am" → owner:"Andrea", category:"AIL", title:"Kelowna Cycling Camp Registration", date: next Monday, time:"09:00"

Return ONLY valid JSON, no explanation or markdown.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', errorData);
      return NextResponse.json({ error: 'Failed to parse event' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('POST /api/parse error:', error);
    return NextResponse.json({ error: 'Failed to parse event' }, { status: 500 });
  }
}
