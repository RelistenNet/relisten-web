import { search } from '@/data/search';
import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

// Global search. The browser calls this instead of the API: v4 results carry
// only artist ids, and trimming here sends ~5 KB instead of ~60 KB.
const searchParams = defineSearchParams({
  q: z.string().trim().max(100).default(''),
});

export async function GET() {
  let q = '';
  try {
    q = searchParams.get().q;
  } catch {
    return new Response('q is too long', { status: 400 });
  }

  const results = await search(q);
  return Response.json(results, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  });
}
