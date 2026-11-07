import { deny, redirect, type MiddlewareContext } from '@timber-js/app/server';
import { isLegacySourceParam, toSourceParam } from '@/lib/sourceParam';
import { findArtistBySlug } from '@/data/artists';
import { resolveLegacySource } from '@/data/legacy';
import { movedQuickHitUrl } from '@/lib/movedSectionUrl';

const VALID_SEGMENT = /^[a-zA-Z0-9-]+$/;

export default async function middleware(ctx: MiddlewareContext): Promise<Response | void> {
  ctx.headers.set('Cache-Control', 'private, no-cache, no-store');

  // Reject requests with path segments that don't look like valid slugs.
  // Prevents browser devtools requests (installHook.js.map), bots, and
  // scanners from hitting the [artistSlug] dynamic route and triggering
  // unnecessary API calls + render errors.
  const url = new URL(ctx.req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  for (const segment of segments) {
    if (!VALID_SEGMENT.test(segment)) {
      deny(404);
    }
  }

  const artistSlug = segments[0];
  if (!artistSlug) return;

  // Served from the cached artist directory (see artistDirectory.ts).
  const artist = await findArtistBySlug(artistSlug);
  if (!artist) deny(404);

  // The browse view's old section pages (top, songs, tours, …) are detail pages
  // now; send their URLs to the equivalent page.
  const moved = movedQuickHitUrl(artistSlug, segments, url.searchParams);
  if (moved) redirect(moved, { permanent: true });

  // Links shared before v4 carry an integer source id (or a v3 uuid). Point them
  // at the v4 id once, permanently; only these old links pay for the lookup.
  const source = url.searchParams.get('source');
  if (source && isLegacySourceParam(source)) {
    const sourceId = await resolveLegacySource(artist.id, source).catch(() => null);
    if (sourceId) url.searchParams.set('source', toSourceParam(sourceId));
    else url.searchParams.delete('source');
    redirect(`${url.pathname}${url.search}`, { permanent: Boolean(sourceId) });
  }
}
