export const runtime = 'nodejs';

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return Response.json({ error: 'Add SARVAM_API_KEY to .env.local to enable voice transcription.' }, { status: 503 });

  try {
    const input = await request.formData();
    const audio = input.get('audio');
    const languageCode = input.get('languageCode');
    if (!(audio instanceof File)) return Response.json({ error: 'Audio file is required.' }, { status: 400 });
    if (audio.size > 12 * 1024 * 1024) return Response.json({ error: 'Audio must be under 12 MB.' }, { status: 413 });

    const form = new FormData();
    form.append('file', audio, audio.name || 'voice-note.webm');
    form.append('model', 'saaras:v4');
    form.append('mode', 'transcribe');
    if (typeof languageCode === 'string' && languageCode) form.append('language_code', languageCode);
    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST', headers: { 'api-subscription-key': apiKey }, body: form
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: result.error?.message || 'Sarvam transcription failed.' }, { status: response.status });
    return Response.json({ transcript: result.transcript, languageCode: result.language_code });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not transcribe audio.' }, { status: 500 });
  }
}
