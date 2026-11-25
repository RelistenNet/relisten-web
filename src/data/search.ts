import 'server-only';

import { href } from '@timber-js/app/routes';
import { z } from 'zod/v4';
import { RelistenApiError, unwrap } from '@/api/fetcher';
import { getApiV4Search } from '@/api/generated/client';
import {
  EMPTY_SEARCH,
  MIN_QUERY_LENGTH,
  SEARCH_SCOPES,
  UNAVAILABLE_SEARCH,
  type ExcerptRun,
  type ResultScope,
  type SearchHit,
  type SearchResults,
  type SearchScope,
} from '@/lib/search';
import { decodeEntities } from '@/lib/htmlEntities';
import { USER_SERVICE_URL, userServiceRoutingHeaders } from '@/lib/session/config';
import { sessionCookie } from '@/lib/session/sessionCookie';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { numberFormat, splitShowDate } from '@/lib/utils';
import { formatShowDate } from '@/ui/shows/stats';
import { trackHref } from '@/ui/shows/trackHref';
import { cache as requestCache } from 'react';
import { defineResource, MINUTES } from './resource';
import { userServiceFetch } from './session';

// Search. All and Playlists go to the User Service's /v1/search, which ranks
// public playlists among the catalog's results; the catalog's own scopes (and
// Add Tracks) go straight to the catalog's /api/v4/search. Both answer with the
// same rows: each embeds the v4 resources it points at (artist, song, show,
// source, track) or a playlist card. Only the fields read here are parsed, each
// row on its own: one malformed row drops out, not the page.
//
// A signed-in visitor's /v1/search carries their session, so it also finds
// their own private playlists; that answer is theirs alone and is never cached
// across requests. A guest's goes without cookies: every guest gets the same
// answer, so it's cached across them.

/** The page waits on search before its shell flushes; past this it says search is unavailable. */
const SEARCH_TIMEOUT_MS = 5_000;

const text = z.string().nullish();

const artistSchema = z.object({ slug: text, name: text });

const venueSchema = z.object({
  id: text,
  slug: text,
  name: text,
  city: text,
  region: text,
});

const showSchema = z.object({
  /** "YYYY-MM-DD". */
  display_date: text,
  has_soundboard_source: z.boolean().nullish(),
  artist_venue: z.object({ venue: venueSchema.nullish() }).nullish(),
  imported_venue: z.object({ name: text, location: text }).nullish(),
});

const sourceSchema = z.object({ id: text, is_soundboard: z.boolean().nullish() });

const resultSchema = z.object({
  kind: text,
  key: text,
  match: z.object({ highlights: z.record(z.string(), z.string()).nullish() }).nullish(),
  artist: artistSchema.nullish(),
  song: z.object({ id: text, name: text }).nullish(),
  venue: venueSchema.nullish(),
  show: showSchema.nullish(),
  source: sourceSchema.nullish(),
  performance: z.object({ song: text }).nullish(),
  preview_track: z
    .object({
      id: text,
      source_id: text,
      slug: text,
      title: text,
      duration: z.number().nullish(),
    })
    .nullish(),
  review: z.object({ title: text, source_id: text }).nullish(),
  playlist: z
    .object({ name: text, track_count: z.number().nullish(), public_code: text, curator: text })
    .nullish(),
});
type Result = z.infer<typeof resultSchema>;

const responseSchema = z.object({
  availability: z.object({ catalog: text, playlists: text }).nullish(),
  counts: z.record(z.string(), z.number()).nullish(),
  readings: z
    .object({
      applied: z
        .object({ chips: z.array(z.object({ key: text, label: text })).nullish() })
        .nullish(),
    })
    .nullish(),
  results: z.array(z.unknown()).nullish(),
  next_page: z.number().nullish(),
});

const parseResults = (list: unknown[] | null | undefined): Result[] =>
  (list ?? []).flatMap((r) => {
    const parsed = resultSchema.safeParse(r);
    return parsed.success ? [parsed.data] : [];
  });

function showHref(artistSlug: string, date: string, sourceId?: string | null) {
  const { year, month, day } = splitShowDate(date);
  return href(
    '/[artistSlug]/[year]/[month]/[day]',
    { artistSlug, year, month, day },
    sourceId ? sourceQuery(sourceId) : undefined
  );
}

/** A performance's track on the recording it previews; the show when the track has no slug. */
export function performanceHref(
  artistSlug: string,
  date: string,
  track: { slug?: string | null; source_id?: string | null } | null | undefined
) {
  if (!track?.slug) return showHref(artistSlug, date, track?.source_id);
  const { year, month, day } = splitShowDate(date);
  return trackHref(
    'site',
    { artistSlug, year, month, day, songSlug: track.slug },
    track.source_id ? sourceQuery(track.source_id) : undefined
  );
}

const plain = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, ''));

/**
 * A Typesense highlight ("…<mark>Dark</mark> <mark>Star</mark>…") as runs of
 * text. Rendered as React text, never as HTML.
 */
export function excerptRuns(html: string | undefined): ExcerptRun[] | undefined {
  if (!html) return undefined;
  const runs: ExcerptRun[] = [];
  const marks = /<mark>([\s\S]*?)<\/mark>/g;
  let last = 0;
  for (const m of html.matchAll(marks)) {
    if (m.index > last) runs.push({ text: plain(html.slice(last, m.index)), match: false });
    runs.push({ text: plain(m[1]), match: true });
    last = m.index + m[0].length;
  }
  if (last < html.length) runs.push({ text: plain(html.slice(last)), match: false });
  const kept = runs.filter((r) => r.text);
  return kept.length ? kept : undefined;
}

/** The first highlight among `fields` (e.g. "review.review"), in that order. */
const highlight = (r: Result, ...fields: string[]) =>
  fields.map((f) => r.match?.highlights?.[f]).find(Boolean);

const compact = (parts: (string | null | undefined | false)[]) =>
  parts.flatMap((p) => (p ? [p.trim()] : [])).filter(Boolean);

type Venue = z.infer<typeof venueSchema>;

/** "Ithaca, NY". */
const place = (v: Venue | null | undefined) =>
  compact([v?.city, v?.region]).join(', ') || undefined;

/** A show's venue and city: the canonical venue, else the artist's imported one. */
function showPlace(show: Result['show']): string[] {
  const venue = show?.artist_venue?.venue;
  if (venue) return compact([venue.name, place(venue)]);
  return compact([show?.imported_venue?.name, show?.imported_venue?.location]);
}

/**
 * One API result → a linkable hit, or undefined when it can't be linked or the
 * app has no page for it (tours, segue sequences).
 */
function toHit(r: Result): SearchHit | undefined {
  const id = r.key;
  if (!id) return undefined;
  const artistSlug = r.artist?.slug || undefined;
  const artistName = r.artist?.name;
  const date = r.show?.display_date || undefined;

  switch (r.kind) {
    case 'artist':
      if (!artistSlug || !artistName) return undefined;
      return {
        id,
        kind: 'artist',
        title: artistName,
        detail: [],
        href: href('/artists/[artistSlug]', { artistSlug }),
      };
    case 'song': {
      // Song pages take a song id (canonical or imported) and redirect to the slug.
      const songId = r.song?.id;
      if (!artistSlug || !songId || !r.song?.name) return undefined;
      if (!songId.startsWith('song_') && !songId.startsWith('imported_song_')) return undefined;
      return {
        id,
        kind: 'song',
        title: r.song.name,
        detail: compact([artistName]),
        href: href('/artists/[artistSlug]/songs/[songSlug]', { artistSlug, songSlug: songId }),
      };
    }
    case 'venue': {
      // Imported venues' pages take their id; canonical venues their slug.
      const venue = r.venue;
      const venueSlug = venue?.id?.startsWith('imported_venue_') ? venue.id : venue?.slug;
      if (!venueSlug || !venue?.name) return undefined;
      return {
        id,
        kind: 'venue',
        title: venue.name.trim(),
        detail: compact([place(venue), artistName]),
        href: href('/venues/[venueSlug]', { venueSlug }),
      };
    }
    case 'show':
      if (!artistSlug || !date) return undefined;
      return {
        id,
        kind: 'show',
        title: formatShowDate(date),
        detail: compact([artistName, ...showPlace(r.show)]),
        soundboard: r.show?.has_soundboard_source || undefined,
        href: showHref(artistSlug, date),
      };
    case 'performance': {
      const track = r.preview_track;
      const title = r.performance?.song || track?.title;
      if (!artistSlug || !date || !title) return undefined;
      return {
        id,
        kind: 'performance',
        title,
        detail: compact([artistName, formatShowDate(date), showPlace(r.show)[0]]),
        duration: track?.duration || undefined,
        trackId: track?.id || undefined,
        href: performanceHref(artistSlug, date, track),
      };
    }
    case 'recording':
      if (!artistSlug || !date) return undefined;
      return {
        id,
        kind: 'recording',
        title: formatShowDate(date),
        detail: compact([artistName, ...showPlace(r.show)]),
        excerpt: excerptRuns(highlight(r, 'source.taper_notes', 'source.description')),
        soundboard: r.source?.is_soundboard || undefined,
        href: showHref(artistSlug, date, r.source?.id),
      };
    case 'review':
      if (!artistSlug || !date) return undefined;
      return {
        id,
        kind: 'review',
        title: r.review?.title ? plain(r.review.title) : 'Review',
        detail: compact([artistName, formatShowDate(date), showPlace(r.show)[0]]),
        excerpt: excerptRuns(highlight(r, 'review.review', 'review.title')),
        href: showHref(artistSlug, date, r.source?.id ?? r.review?.source_id),
      };
    case 'playlist': {
      // Public playlists' pages take the share code.
      const playlist = r.playlist;
      if (!playlist?.public_code || !playlist.name) return undefined;
      const tracks = playlist.track_count;
      return {
        id,
        kind: 'playlist',
        title: playlist.name,
        detail: compact([
          playlist.curator,
          tracks != null && `${numberFormat.format(tracks)} ${tracks === 1 ? 'track' : 'tracks'}`,
        ]),
        href: href('/playlists/[playlist]', { playlist: playlist.public_code }),
      };
    }
    default:
      return undefined;
  }
}

type Readings = z.infer<typeof responseSchema>['readings'];

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const regionName = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/**
 * The chips for the reading the results enforce. The API's alternative
 * readings (Dark Star Orchestra for "dark star") only boost results, so they
 * aren't shown as filters.
 */
const appliedChips = (readings: Readings): string[] =>
  compact(
    (readings?.applied?.chips ?? []).map((c) =>
      c.key === 'country' && c.label ? regionName(c.label) : c.label
    )
  );

/** The catalog answered, but said search is unavailable (its index is down or rebuilding). */
class SearchUnavailableError extends Error {
  constructor() {
    super('Catalog search reported itself unavailable');
  }
}

const RESULT_SCOPES = SEARCH_SCOPES.filter((s): s is ResultScope => s !== 'all');

/**
 * One response → the app's results. Throws when the part of search this scope
 * needs reports itself unavailable: a returned value would be cached, and the
 * outage would outlive its recovery. search() turns it into UNAVAILABLE_SEARCH.
 */
export function toSearchResults(raw: unknown, scope: SearchScope): SearchResults {
  const r = responseSchema.parse(raw);
  const needed = scope === 'playlists' ? r.availability?.playlists : r.availability?.catalog;
  if (needed === 'unavailable') throw new SearchUnavailableError();
  const seen = new Set<string>();
  const hits = parseResults(r.results).flatMap((result) => {
    const hit = toHit(result);
    if (!hit || seen.has(hit.id)) return [];
    seen.add(hit.id);
    return [hit];
  });
  // Exact totals only: a lower bound would read as the whole count.
  const counts: SearchResults['counts'] = {};
  for (const s of RESULT_SCOPES) {
    const n = r.counts?.[s];
    if (typeof n === 'number') counts[s] = n;
  }
  // All ranks every kind in one list; the page groups recordings and reviews
  // below the rest, keeping the ranking's order within each.
  const isEvidence = (h: SearchHit) => h.kind === 'recording' || h.kind === 'review';
  return {
    availability: 'full',
    chips: appliedChips(r.readings),
    counts,
    top: hits.filter((h) => !isEvidence(h)),
    recordings: hits.filter((h) => h.kind === 'recording'),
    reviews: hits.filter((h) => h.kind === 'review'),
    results: hits,
    nextPage: r.next_page ?? undefined,
  };
}

type SearchArgs = [q: string, scope: SearchScope, page: number, typing: 0 | 1];

const catalogResults = defineResource({
  // v2: the typed-results response (RelistenApi#156).
  name: 'catalog-search-v2',
  ttl: 5 * MINUTES,
  load: (...[q, scope, page, typing]: SearchArgs) =>
    unwrap(
      getApiV4Search(
        // The catalog has no playlists; the User Service's search does.
        { q, scope: scope === 'playlists' ? 'all' : scope, page, typing: typing === 1 },
        { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) }
      )
    ),
  slim: (raw, _q, scope) => toSearchResults(raw, scope),
});

const mergedPath = (...[q, scope, page, typing]: SearchArgs) =>
  `/v1/search?${new URLSearchParams({ q, scope, page: String(page), typing: String(typing === 1) })}`;

/** A guest's merged search: public playlists only, the same for every guest. */
const guestResults = defineResource({
  name: 'merged-search',
  ttl: 5 * MINUTES,
  load: async (...args: SearchArgs) => {
    const res = await fetch(`${USER_SERVICE_URL}${mergedPath(...args)}`, {
      headers: { accept: 'application/json', ...userServiceRoutingHeaders() },
      cache: 'no-store',
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new RelistenApiError(res.status);
    return (await res.json()) as unknown;
  },
  slim: (raw, _q, scope) => toSearchResults(raw, scope),
});

/**
 * A signed-in visitor's merged search, with their own playlists: deduped within
 * the request, never shared. Keyed on the token, as getCurrentUser is.
 */
const sessionResults = requestCache(
  async (_token: string, ...args: SearchArgs): Promise<SearchResults> => {
    const res = await userServiceFetch(mergedPath(...args), {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    // A dead session searches as a guest; the nav clears the cookie.
    if (res.status === 401) return guestResults.get(...args);
    if (!res.ok) throw new RelistenApiError(res.status);
    return toSearchResults(await res.json(), args[1]);
  }
);

const mergedResults = (...args: SearchArgs): Promise<SearchResults> => {
  const token = sessionCookie.get();
  return token ? sessionResults(token, ...args) : guestResults.get(...args);
};

/** All with playlists ranked in; catalog-only when the User Service can't answer. */
async function allResults(...args: SearchArgs): Promise<SearchResults> {
  try {
    return await mergedResults(...args);
  } catch (err) {
    if (err instanceof RelistenApiError && err.status === 422) throw err;
    console.error('Playlist search unavailable; searching the catalog only', err);
    return catalogResults.get(...args);
  }
}

const results = (...args: SearchArgs): Promise<SearchResults> => {
  const scope = args[1];
  if (scope === 'all') return allResults(...args);
  if (scope === 'playlists') return mergedResults(...args);
  return catalogResults.get(...args);
};

type SearchOptions = {
  scope?: SearchScope;
  page?: number;
  /** Typeahead: the API answers faster and leaves recordings and reviews out of All. */
  typing?: boolean;
};

/**
 * Empty for queries under two characters. `unavailable` when the API fails or
 * takes longer than SEARCH_TIMEOUT_MS, so the UI never shows that as "no results".
 */
export async function search(
  q: string,
  { scope = 'all', page = 1, typing = false }: SearchOptions = {}
): Promise<SearchResults> {
  const query = q.trim().toLowerCase();
  if (query.length < MIN_QUERY_LENGTH) return EMPTY_SEARCH;
  try {
    return await results(query, scope, page, typing ? 1 : 0);
  } catch (err) {
    // 422: a query the API won't search (a value it rejects). Nothing to show, not an outage.
    if (err instanceof RelistenApiError && err.status === 422) return EMPTY_SEARCH;
    console.error('Search unavailable', err);
    return UNAVAILABLE_SEARCH;
  }
}
