// /api/coach.js — Gemini proxy (set GEMINI_KEY in Vercel env vars)

const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

const SYSTEM_CHAT = (ctx) => `You are an expert personal trainer and strength coach inside a fitness app called MuscleUp. You give concise, motivational, data-driven advice.

User profile:
- Name: ${ctx.name}
- Level: ${ctx.level} (${ctx.xp} XP total)
- Current streak: ${ctx.streak} days
- Total workouts logged: ${ctx.workoutCount}

Recent workout history (last 5):
${ctx.recentWorkouts || 'No workouts yet.'}

Muscle group distribution (% of total sets):
${ctx.muscleBalance || 'No data yet.'}

Rules:
- Keep responses under 120 words unless the user asks for a detailed plan
- Be specific — reference their actual exercises, weights, and history
- Use encouragement but skip filler phrases like "Great question!"
- For progressive overload, recommend specific weight/rep targets`;

const SYSTEM_GENERATE = (ctx, prefs) => `You are a workout programming expert. Generate a single gym workout as valid JSON only — no markdown, no explanation, just the JSON object.

User context:
- Level: ${ctx.level}, streak: ${ctx.streak} days
- Recent workouts: ${ctx.recentWorkouts || 'none'}
- Muscle balance: ${ctx.muscleBalance || 'none'}

Workout preferences:
- Goal: ${prefs.goal}
- Equipment: ${prefs.equipment}
- Intensity: ${prefs.intensity}

Return ONLY this JSON structure (no \`\`\` fences):
{"title":"<workout name>","exercises":[{"name":"<exercise name>","sets":[{"reps":<number>,"weight":<kg as number>},...]},...]  }

Rules:
- 4–6 exercises, 3–4 sets each
- Exercise names must exactly match common gym exercise names
- For Bodyweight equipment: weight = 0 for all sets
- Vary rep ranges by goal: Strength=3-6 reps, Hypertrophy=8-12 reps, Fat Loss=12-15 reps
- Higher intensity = more sets and heavier weight
- Don't repeat muscle groups from the most recent workout if possible`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const key = process.env.GEMINI_KEY;
  if (!key) return res.status(200).json({ error: 'no_key' });

  const { type, messages, context, preferences } = req.body || {};
  if (!type || !context) return res.status(400).json({ error: 'bad_request' });

  try {
    if (type === 'generate') {
      const systemPrompt = SYSTEM_GENERATE(context, preferences || {});
      const resp = await fetch(GEMINI_URL(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: 'Generate my workout now.' }] }],
        }),
      });
      const data = await resp.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      try {
        const clean = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        const workout = JSON.parse(clean);
        return res.json({ workout });
      } catch {
        return res.status(500).json({ error: 'parse_error', raw });
      }
    }

    // type === 'chat'
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'bad_request' });
    }
    const systemPrompt = SYSTEM_CHAT(context);
    const resp = await fetch(GEMINI_URL(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages,
      }),
    });
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I had trouble responding. Try again!';
    return res.json({ text });

  } catch (err) {
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
