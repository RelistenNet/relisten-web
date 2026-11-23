import { search } from '@/data/search';
import { searchSearchParams } from '@/lib/searchParams/apiSearchParams';

// GlobalSearch's typeahead. The browser calls this instead of the API: the
// results arrive slimmed and already linked (venue and tour slugs resolved).
const searchParams = searchSearchParams;

export async function GET() {
  const { q } = searchParams.get();
  const results = await search(q, { typing: true });
  return Response.json(results, {
    headers: {
      // An outage isn't cached: the next keystroke tries again.
      'Cache-Control':
        results.availability === 'full'
          ? 'public, max-age=300, stale-while-revalidate=3600'
          : 'no-store',
    },
  });
}
