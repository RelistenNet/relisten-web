import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import RelistenAPI from '@/lib/RelistenAPI';
import { slimSummary } from '@/lib/live';

// The Live page polls this instead of the API directly: the raw summary carries
// a full source object per artist (~270 KB), and the page needs ~20 KB of it.
const searchParams = defineSearchParams({
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
});

export async function GET() {
  let today: { month?: number; day?: number } = {};
  try {
    today = searchParams.get();
  } catch {
    // Falls through to the 400 below.
  }

  const { month, day } = today;
  if (!month || !day) {
    // deny() surfaces as a 500 in route handlers, so return the status directly.
    return new Response('month (1-12) and day (1-31) are required', { status: 400 });
  }

  const summary = slimSummary(await RelistenAPI.fetchLiveSummary({ month, day }), { month, day });

  return Response.json(summary, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' },
  });
}
