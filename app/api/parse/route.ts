import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a calendar assistant for a family business calendar called Hamer HQ. Parse the user's natural language input and return a JSON object with these fields:
- title (string, required): concise event title
- date (string, required): YYYY-MM-DD format. If no year given assume 2025 or 2026 as appropriate based on context. Today is ${today}.
- time (string, optional): HH:MM in 24-hour format
- endTime (string, optional): HH:MM in 24-hour format
- category (string, required): one of "AIL", "SPS", "TPB", "Personal"
- note (string, optional): any additional details

Category detection rules:
- AIL (Adventuring Into Life): keywords like adventuring, cycling, camp, program, Kamloops, Vernon, Kelowna, Valemount, Andrea's business
- SPS (Sustainable Paving Stones): keywords like paving, stones, asphalt, blacktop, enduro, Gary Wilson, Rod, David, franchise, brick
- TPB (The Pickleball Body): keywords like pickleball, kitchen test, ankle, mobility, protocol, court, player
- Personal: everything else — dentist, family, kids, personal, home, groceries, travel, default

Return ONLY valid JSON, no explanation or markdown.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
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
