export const runtime = 'nodejs';

const supportedLanguages = new Set(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN', 'gu-IN', 'pa-IN']);

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return Response.json({ error: 'Add SARVAM_API_KEY to .env.local to enable spoken replies.' }, { status: 503 });

  try {
    const { text, languageCode = 'en-IN' } = await request.json();
    if (!text?.trim()) return Response.json({ error: 'Text is required.' }, { status: 400 });
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, 2400), model: 'bulbul:v4-flash',
        language_code: supportedLanguages.has(languageCode) ? languageCode : 'en-IN',
        speech_sample_rate: 22050
      })
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: result.error?.message || 'Sarvam speech generation failed.' }, { status: response.status });
    return Response.json({ audio: result.audios?.[0] });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not generate speech.' }, { status: 500 });
  }
}
