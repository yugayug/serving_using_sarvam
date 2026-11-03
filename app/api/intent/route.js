export const runtime = 'nodejs';

const languages = {
  'en-IN': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
  'kn-IN': 'Kannada', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi'
};

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return Response.json({ error: 'Sarvam key is not configured.' }, { status: 503 });
  try {
    const { message, context = '', languageCode = 'en-IN' } = await request.json();
    if (!message?.trim()) return Response.json({ error: 'Message is required.' }, { status: 400 });
    const language = languages[languageCode] || 'English';
    const system = `You are the intent router for Daylight, a family voice assistant. Understand the user's request in any language and return exactly one JSON object, with no markdown. Always write the reply in ${language}. Choose one intent from: grocery_add, grocery_done, meal_add, medication_add, medication_done, expense_add, commute_update, family_note, bargain, question. Return keys: intent, reply, item, quantity, dish, day, mealSlot, name, time, amount, category, destination, note, targetOffer. Use null for unused values. For day use Today or Tomorrow when specified, otherwise Tomorrow. For mealSlot use Breakfast, Lunch, or Dinner. Use only user-provided prices; never claim live prices. Medication requests may only create/complete reminders; never recommend doses or medical decisions. If they ask a general question, use question. Keep reply concise and conversational. Context: ${String(context).slice(0, 2500)}`;
    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sarvam-105b-conversations', reasoning_effort: null, temperature: 0.1, max_tokens: 350,
        messages: [{ role: 'system', content: system }, { role: 'user', content: String(message).slice(0, 1000) }]
      })
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: result.error?.message || 'Sarvam intent request failed.' }, { status: response.status });
    const content = result.choices?.[0]?.message?.content || '';
    const json = content.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return Response.json({ error: 'Could not understand that request.' }, { status: 422 });
    const parsed = JSON.parse(json);
    const allowed = new Set(['grocery_add', 'grocery_done', 'meal_add', 'medication_add', 'medication_done', 'expense_add', 'commute_update', 'family_note', 'bargain', 'question']);
    if (!allowed.has(parsed.intent)) return Response.json({ error: 'Unsupported intent.' }, { status: 422 });
    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: error.message || 'Could not interpret that request.' }, { status: 500 });
  }
}
