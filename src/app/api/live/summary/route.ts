import { liveSummary } from '@/data/live';
import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import { slimSummary } from '@/lib/live';

// The Live page polls this instead of the API directly: the raw summary carries
// a full source object per artist (~270 KB), and the page needs ~20 KB of it.
const searchParams = defineSearchParams({
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
});

export async function GET() {
  let params: { month?: number; day?: number } = {};
  try {
    params = searchParams.get();
  } catch {
    // Falls through to the 400 below.
  }

  const { month, day } = params;
  if (!month || !day) {
    // deny() surfaces as a 500 in route handlers, so return the status directly.
    return new Response('month (1-12) and day (1-31) are required', { status: 400 });
  }

  const today = { month, day };
  const summary = await liveSummary(today);
  if (!summary) {
    // Not a cacheable empty 200: the page would replace its last good data with
    // "nobody listening". An error lets it keep that data and back off.
    return new Response('Live summary unavailable', {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return Response.json(slimSummary(summary, today), {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' },
  });
}
