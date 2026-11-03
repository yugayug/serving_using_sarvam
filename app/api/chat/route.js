export const runtime = 'nodejs';

const languageNames = {
  'en-IN': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
  'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi',
  'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi', 'od-IN': 'Odia', 'as-IN': 'Assamese'
};

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return Response.json({ error: 'Add SARVAM_API_KEY to .env.local to enable the Sarvam assistant.' }, { status: 503 });

  try {
    const { message, context = '', languageCode = 'en-IN' } = await request.json();
    if (!message?.trim()) return Response.json({ error: 'Message is required.' }, { status: 400 });
    const language = languageNames[languageCode] || 'English';
    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sarvam-105b-conversations', reasoning_effort: null, max_tokens: 240, temperature: 0.5,
        messages: [
          { role: 'system', content: `You are Daylight, a warm, concise family daily-life assistant. Reply in ${language}. Help with meal ideas, grocery bargaining, household planning, and general organization. Never advise on medication doses or medical decisions; suggest contacting a clinician. Do not claim live prices or commute data. Keep spoken-friendly replies under 65 words. Family context: ${String(context).slice(0, 3000)}` },
          { role: 'user', content: String(message).slice(0, 1000) }
        ]
      })
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: result.error?.message || 'Sarvam assistant request failed.' }, { status: response.status });
    return Response.json({ reply: result.choices?.[0]?.message?.content || 'I could not come up with a reply. Try again.' });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not reach Sarvam.' }, { status: 500 });
  }
}
