import Anthropic from 'npm:@anthropic-ai/sdk';

const GOAL_LABELS: Record<string, string> = {
  first_5k: 'Complete first 5K',
  first_10k: 'Complete first 10K',
  first_half: 'Run a half marathon',
  first_marathon: 'Finish a marathon',
  pb_half: 'Half marathon personal best',
  pb_marathon: 'Marathon personal best',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { goal, numWeeks, planName, athleteNotes } = await req.json();

    const client = new Anthropic();

    const goalLabel = GOAL_LABELS[goal] ?? goal ?? 'General fitness';

    const prompt = `You are an expert running coach. Generate a ${numWeeks}-week training plan.

Plan: ${planName || goalLabel}
Goal: ${goalLabel}
${athleteNotes ? `Athlete notes: ${athleteNotes}` : ''}

Return ONLY valid JSON — no markdown, no explanation:
{
  "weeks": [
    {
      "phase": "Base Building",
      "focus": "Aerobic development",
      "days": [
        { "type": "easy",     "title": "Easy Run",    "km": 8,    "notes": "Conversational pace, HR zone 2", "targetPace": "6:00-6:30/km" },
        { "type": "rest",     "title": "Rest",        "km": null, "notes": "", "targetPace": null },
        { "type": "tempo",    "title": "Tempo Run",   "km": 6,    "notes": "Comfortably hard effort",       "targetPace": "5:10-5:20/km" },
        { "type": "rest",     "title": "Rest",        "km": null, "notes": "", "targetPace": null },
        { "type": "easy",     "title": "Easy Run",    "km": 10,   "notes": "Easy recovery pace",            "targetPace": "6:00-6:30/km" },
        { "type": "long",     "title": "Long Run",    "km": 18,   "notes": "Easy long effort",              "targetPace": "6:15-6:45/km" },
        { "type": "rest",     "title": "Rest",        "km": null, "notes": "Active recovery or rest",       "targetPace": null }
      ]
    }
  ]
}

Rules:
- Exactly ${numWeeks} weeks, exactly 7 days each (Mon–Sun)
- Types allowed: easy, tempo, interval, long, rest, strength
- km is null on rest days
- Progress volume and intensity sensibly across weeks
- For race goals, include a taper in the final 1–2 weeks
- targetPace is a string like "5:30/km" or "5:00-5:20/km", or null`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');

    const plan = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Generation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
