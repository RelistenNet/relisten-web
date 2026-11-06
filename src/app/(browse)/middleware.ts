import { deny, redirect, type MiddlewareContext } from '@timber-js/app/server';
import { isLegacySourceParam, toSourceParam } from '@/lib/sourceParam';
import { findArtistBySlug } from '@/lib/v4/artistDirectory';
import { resolveLegacySource } from '@/lib/v4/legacy';
import {
  artistRecentlyAddedUrl,
  artistSongsUrl,
  artistTodayUrl,
  artistToursUrl,
  artistTopShowsUrl,
  artistVenuesUrl,
  songUrl,
  tourUrl,
  venueUrl,
} from '@/lib/urls';

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

/**
 * Where an old browse section URL lives now, or null if it isn't one:
 *   /gd/top → /artists/gd?sort=-rating              /gd/songs → /artists/gd/songs
 *   /gd/songs?slug=x → the song page       /gd/today-in-history/5/8 → ?month=5&day=8
 *   /gd/songs?slug=x&date=1977-05-08[&track=t] → that show (on that track)
 */
function movedQuickHitUrl(artist: string, segments: string[], query: URLSearchParams) {
  const section = segments[1];
  const slug = query.get('slug');
  const date = query.get('date');
  const track = query.get('track');

  switch (section) {
    case 'top':
      return artistTopShowsUrl(artist);
    case 'recently-added':
      return artistRecentlyAddedUrl(artist);
    case 'today-in-history':
      return artistTodayUrl(
        artist,
        segments[2] ?? query.get('month') ?? undefined,
        segments[3] ?? query.get('day') ?? undefined
      );
    case 'songs':
    case 'venues':
    case 'tours': {
      // A show was open in the section: go to the show itself.
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const show = `/${artist}/${date.replaceAll('-', '/')}`;
        const source = query.get('source');
        return `${track ? `${show}/${track}` : show}${source ? `?source=${source}` : ''}`;
      }
      if (section === 'songs') return slug ? songUrl(artist, slug) : artistSongsUrl(artist);
      if (section === 'venues') return slug ? venueUrl(slug, artist) : artistVenuesUrl(artist);
      return slug ? tourUrl(artist, slug) : artistToursUrl(artist);
    }
    default:
      return null;
  }
}
