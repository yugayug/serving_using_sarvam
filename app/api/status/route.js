export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ sarvamConfigured: Boolean(process.env.SARVAM_API_KEY) });
}
