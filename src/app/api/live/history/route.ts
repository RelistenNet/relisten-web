import { livePlays } from '@/data/live';
import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

// The Live page's feed polls this rather than the API: v4 history rows carry
// only artist ids, and every browser here shares one cached upstream read.
const searchParams = defineSearchParams({
  /** Only plays with a higher sequence number than this. */
  after: z.coerce.number().int().min(0).default(0),
});

export async function GET() {
  let after = 0;
  try {
    after = searchParams.get().after;
  } catch {
    return new Response('after must be a non-negative integer', { status: 400 });
  }

  const plays = await livePlays(after, after ? 200 : 30);
  return Response.json(plays, { headers: { 'Cache-Control': 'no-store' } });
}
