import { isBackendReady } from '@/lib/backend-monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '');
  let available = false;
  try {
    const response = await fetch(`${base}/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
      headers: { Accept: 'application/json' },
    });
    available = response.ok && isBackendReady(await response.json());
  } catch {
    // A stopped API and an unavailable database both block business data.
  }
  return Response.json(
    { success: available, data: { database: available ? 'connected' : 'disconnected' } },
    { status: available ? 200 : 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
