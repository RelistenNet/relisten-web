import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import RelistenAPI from '@/lib/RelistenAPI';
import { isMonthDay, slimSummary } from '@/lib/live';

// The Live page polls this instead of the API directly: the raw summary carries
// a full source object per artist (~270 KB), and the page needs ~5 KB of it.
const searchParams = defineSearchParams({
  month_day: z.string().refine(isMonthDay),
});

export async function GET() {
  let monthDay: string | undefined;
  try {
    ({ month_day: monthDay } = searchParams.get());
  } catch {
    monthDay = undefined;
  }
  if (!monthDay) {
    // deny() surfaces as a 500 in route handlers, so return the status directly.
    return new Response('month_day must be MM-DD', { status: 400 });
  }

  const summary = slimSummary(await RelistenAPI.fetchLiveSummary(monthDay), monthDay);

  return Response.json(summary, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' },
  });
}
