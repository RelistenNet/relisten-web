import { search } from '@/data/search';
import { searchSearchParams } from '@/lib/searchParams/apiSearchParams';
import { sessionCookie } from '@/lib/session/sessionCookie';

// GlobalSearch's typeahead. The browser calls this instead of the API: the
// results arrive slimmed and already linked.
const searchParams = searchSearchParams;

export async function GET() {
  const { q, scope } = searchParams.get();
  const results = await search(q, { scope, typing: true });
  // A signed-in visitor's results include their own playlists: private, and
  // briefly, so a playlist they just made turns up. Vary: Cookie keeps a guest's
  // cached answer from being reused after they sign in.
  const signedIn = sessionCookie.get() !== null;
  return Response.json(results, {
    headers: {
      // An outage isn't cached: the next keystroke tries again.
      'Cache-Control':
        results.availability !== 'full'
          ? 'no-store'
          : signedIn
            ? 'private, max-age=60'
            : 'public, max-age=300, stale-while-revalidate=3600',
      'Vary': 'Cookie',
    },
  });
}
