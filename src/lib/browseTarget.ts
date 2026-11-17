import 'server-only';

import { deny } from '@timber-js/app/server';
import RelistenAPI from '@/lib/RelistenAPI';
import { parseBrowseUrl, type BrowseRequest, type BrowseUrlParams } from '@/lib/browseUrl';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import type { Tape } from '@/types';

type ShowRequest = Extract<BrowseRequest, { kind: 'show' }>;

/** A request whose entities exist. A show target carries the fetched show. */
export type BrowseTarget =
  | Exclude<BrowseRequest, { kind: 'invalid' | 'show' }>
  | (ShowRequest & { show: Partial<Tape> });

function hasTrack(show: Partial<Tape>, track: string): boolean {
  return !!show.sources?.some((source) =>
    source.sets?.some((set) => set.tracks?.some((t) => t.slug === track))
  );
}

async function loadQuickHitList(artistSlug: string, segment: string, slug: string) {
  // Each fetcher deny(404)s on an upstream 404 (RelistenAPI.apiFetch).
  if (segment === 'songs') return RelistenAPI.fetchSongShows(artistSlug, slug);
  if (segment === 'venues') return RelistenAPI.fetchVenueShows(artistSlug, slug);
  if (segment === 'tours') return RelistenAPI.fetchTourShows(artistSlug, slug);
}

/**
 * Resolve the primary entity a browse URL names, or deny(404).
 *
 * The browse layout renders five slots, and each used to parse the URL and
 * fetch on its own. A deny() inside a slot only degrades that slot (HTTP 200),
 * so a missing song/show/track on a quick-hit URL rendered an empty column with
 * a 200. This is the single owner: `[artistSlug]/access.ts` calls it on the
 * main chain, where deny() sets the real status, and pages/slots call it again
 * to read what it resolved (every fetch underneath is React.cache + timber.cache).
 */
export async function loadBrowseTarget(request: BrowseRequest): Promise<BrowseTarget> {
  if (request.kind === 'invalid') deny(404);

  const { artistSlug } = request;
  if (request.kind === 'artist' || request.kind === 'today-in-history') return request;

  if (request.kind === 'year') {
    const artists = await RelistenAPI.fetchAllArtists();
    const artist = artists.find((a) => a.slug === artistSlug);
    const years = await RelistenAPI.fetchYears(artist?.uuid);
    if (!years.some((y) => y.year === request.year)) deny(404);
    return request;
  }

  if (request.kind === 'quick-hit') {
    if (request.slug) await loadQuickHitList(artistSlug, request.segment, request.slug);
    return request;
  }

  // kind === 'show'
  const { date, track, segment, slug } = request;
  // Concurrent: the columns fetched these in parallel before this gate existed.
  const [show] = await Promise.all([
    RelistenAPI.fetchShow(artistSlug, date.year, date.display),
    segment && slug ? loadQuickHitList(artistSlug, segment, slug) : undefined,
  ]);
  if (!show?.uuid) deny(404);
  if (track && !hasTrack(show, track)) deny(404);

  return { ...request, show };
}

/** `loadBrowseTarget` for the current request: the caller's segment params plus the quick-hit search params. */
export function loadBrowseTargetFor(params: BrowseUrlParams): Promise<BrowseTarget> {
  return loadBrowseTarget(parseBrowseUrl(params, slugSearchParams.get()));
}
