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
import type { TourSummary, VenueListItem } from '@/domain/types';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { splitShowDate } from '@/lib/utils';
import { formatShowDate } from '@/ui/shows/stats';
import { trackHref } from '@/ui/shows/trackHref';
import { getArtistDirectory, tours } from './artists';
import { defineResource, MINUTES } from './resource';
import { allVenues } from './venues';

// Catalog search (/api/v4/search, Typesense-backed). The wire is snake_case,
// though the OpenAPI document declares camelCase for SearchDocument, so the
// response is parsed here rather than trusted from the generated types. Each
// document is parsed on its own: one malformed document drops out, not the page.

/** The page waits on search before its shell flushes; past this it says search is unavailable. */
const SEARCH_TIMEOUT_MS = 5_000;

const text = z.string().nullish();

const docSchema = z.object({
  id: text,
  kind: text,
  label: text,
  artist_label: text,
  artist_slug: text,
  artist_id: text,
  artist_slugs: z.array(z.string()).nullish(),
  /** yyyymmdd, 0 when the document has no date. */
  date: z.number().nullish(),
  city_label: text,
  venue_label: text,
  source_id: text,
  song_id: text,
  soundboard: z.boolean().nullish(),
  preview: z
    .object({
      track_id: text,
      source_id: text,
      slug: text,
      set: text,
      duration: z.number().nullish(),
    })
    .nullish(),
  highlights: z.record(z.string(), z.string()).nullish(),
});
type Doc = z.infer<typeof docSchema>;

const responseSchema = z.object({
  availability: text,
  interpretation: z
    .object({
      artist: text,
      country: text,
      numbers: z.record(z.string(), z.number()).nullish(),
      soundboard: z.boolean().nullish(),
      matrix: z.boolean().nullish(),
      chronological: z.boolean().nullish(),
      tour_filter: text,
      chips: z.array(z.object({ key: text, label: text })).nullish(),
    })
    .nullish(),
  counts: z.record(z.string(), z.number()).nullish(),
  top: z.array(z.unknown()).nullish(),
  sections: z
    .object({ sources: z.array(z.unknown()).nullish(), reviews: z.array(z.unknown()).nullish() })
    .nullish(),
  results: z.array(z.unknown()).nullish(),
});

const docs = (list: unknown[] | null | undefined): Doc[] =>
  (list ?? []).flatMap((d) => {
    const parsed = docSchema.safeParse(d);
    return parsed.success ? [parsed.data] : [];
  });

/** Slugs for what search returns by id: canonical venues, and tours. Loaded only when needed. */
type Lookups = {
  venueSlug: (venueId: string) => string | undefined;
  tourSlug: (artistId: string, tourId: string) => string | undefined;
  artistName: (artistId: string) => string | undefined;
};

async function lookupsFor(list: Doc[]): Promise<Lookups> {
  const needsVenues = list.some((d) => d.kind === 'venue' && d.id?.startsWith('venue_'));
  const tourArtists = [
    ...new Set(list.flatMap((d) => (d.kind === 'tour' && d.artist_id ? [d.artist_id] : []))),
  ];
  // A failed lookup drops those hits, not the search.
  const none = <T>(): T[] => [];
  const [venues, directory, tourLists] = await Promise.all([
    needsVenues ? allVenues.get().catch(none<VenueListItem>) : none<VenueListItem>(),
    tourArtists.length ? getArtistDirectory().catch(() => undefined) : undefined,
    Promise.all(tourArtists.map((id) => tours.get(id).catch(none<TourSummary>))),
  ]);
  const venueSlugs = new Map(venues.map((v): [string, string] => [v.id, v.slug]));
  const tourSlugs = new Map(
    tourArtists.map((artistId, i): [string, Map<string, string>] => [
      artistId,
      new Map(tourLists[i].map((t): [string, string] => [t.id, t.slug])),
    ])
  );
  return {
    venueSlug: (id) => venueSlugs.get(id),
    tourSlug: (artistId, tourId) => tourSlugs.get(artistId)?.get(tourId),
    artistName: (id) => directory?.byId.get(id)?.name,
  };
}

/** yyyymmdd → "YYYY-MM-DD"; undefined for no date. */
function isoDate(date: number | null | undefined): string | undefined {
  if (!date || date < 1000_00_00) return undefined;
  const s = String(date);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function showHref(artistSlug: string, date: string, sourceId?: string | null) {
  const { year, month, day } = splitShowDate(date);
  return href(
    '/[artistSlug]/[year]/[month]/[day]',
    { artistSlug, year, month, day },
    sourceId ? sourceQuery(sourceId) : undefined
  );
}

/**
 * A performance's track on the recording it previews. Documents indexed before
 * the API returned the track's slug have none; those link to the show instead.
 */
export function performanceHref(artistSlug: string, date: string, preview: Doc['preview']) {
  if (!preview?.slug) return showHref(artistSlug, date, preview?.source_id);
  const { year, month, day } = splitShowDate(date);
  return trackHref(
    'site',
    { artistSlug, year, month, day, songSlug: preview.slug },
    preview.source_id ? sourceQuery(preview.source_id) : undefined
  );
}

const ENTITIES: Record<string, string> = {
  'amp': '&',
  'lt': '<',
  'gt': '>',
  'quot': '"',
  '#39': "'",
  'apos': "'",
};
const plain = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e) => ENTITIES[e]);

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

const firstHighlight = (d: Doc, preferred: string) =>
  d.highlights?.[preferred] ?? Object.values(d.highlights ?? {})[0];

const compact = (parts: (string | null | undefined | false)[]) =>
  parts.flatMap((p) => (p ? [p.trim()] : [])).filter(Boolean);

/** One API document → a linkable hit, or undefined when it can't be linked. */
function toHit(d: Doc, look: Lookups): SearchHit | undefined {
  const id = d.id;
  const artistSlug = d.artist_slug || undefined;
  const date = isoDate(d.date);
  const base = { id: id ?? '', soundboard: d.soundboard || undefined };
  if (!id) return undefined;

  switch (d.kind) {
    case 'artist':
      if (!artistSlug || !d.label) return undefined;
      return {
        ...base,
        kind: 'artist',
        title: d.label,
        detail: [],
        href: href('/artists/[artistSlug]', { artistSlug }),
      };
    case 'song': {
      // Song pages take a song id (canonical or imported) and redirect to the slug.
      const songId = d.song_id || id;
      if (!artistSlug || !d.label) return undefined;
      if (!songId.startsWith('song_') && !songId.startsWith('imported_song_')) return undefined;
      return {
        ...base,
        kind: 'song',
        title: d.label,
        detail: compact([d.artist_label]),
        href: href('/artists/[artistSlug]/songs/[songSlug]', { artistSlug, songSlug: songId }),
      };
    }
    case 'venue': {
      // Imported venues' pages take their id; canonical venues need the slug.
      const venueSlug = id.startsWith('imported_venue_') ? id : look.venueSlug(id);
      if (!venueSlug || !d.label) return undefined;
      const artists = d.artist_slugs?.length ?? 0;
      return {
        ...base,
        kind: 'venue',
        title: d.label,
        detail: compact([d.city_label, artists > 1 ? `${artists} artists` : d.artist_label]),
        href: href('/venues/[venueSlug]', { venueSlug }),
      };
    }
    case 'tour': {
      const tourSlug = d.artist_id ? look.tourSlug(d.artist_id, id) : undefined;
      if (!artistSlug || !tourSlug || !d.label) return undefined;
      return {
        ...base,
        kind: 'tour',
        title: d.label,
        detail: compact([d.artist_label || (d.artist_id && look.artistName(d.artist_id))]),
        href: href('/artists/[artistSlug]/tours/[tourSlug]', { artistSlug, tourSlug }),
      };
    }
    case 'show':
      if (!artistSlug || !date) return undefined;
      return {
        ...base,
        kind: 'show',
        title: formatShowDate(date),
        detail: compact([d.artist_label, d.venue_label, d.city_label]),
        href: showHref(artistSlug, date),
      };
    case 'performance': {
      if (!artistSlug || !date || !d.label) return undefined;
      const set = d.preview?.set;
      const duration = d.preview?.duration;
      return {
        ...base,
        kind: 'performance',
        title: d.label,
        detail: compact([
          d.artist_label,
          formatShowDate(date),
          d.venue_label,
          // "Set" alone is a show with no set breaks.
          set && set !== 'Set' && set,
        ]),
        duration: duration || undefined,
        trackId: d.preview?.track_id || undefined,
        href: performanceHref(artistSlug, date, d.preview),
      };
    }
    case 'recording':
      if (!artistSlug || !date) return undefined;
      return {
        ...base,
        kind: 'recording',
        title: formatShowDate(date),
        detail: compact([d.artist_label, d.venue_label, d.city_label]),
        excerpt: excerptRuns(firstHighlight(d, 'notes')) ?? excerptRuns(d.label ?? undefined),
        href: showHref(artistSlug, date, id),
      };
    case 'review':
      if (!artistSlug || !date) return undefined;
      return {
        ...base,
        kind: 'review',
        title: d.label || 'Review',
        detail: compact([d.artist_label, formatShowDate(date), d.venue_label]),
        excerpt: excerptRuns(firstHighlight(d, 'review_text')),
        href: showHref(artistSlug, date, d.source_id),
      };
    default:
      return undefined;
  }
}

type Interpretation = z.infer<typeof responseSchema>['interpretation'];

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const regionName = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/**
 * The chips for what the API applied to the query. It also returns chips it
 * only suggests ("dark star" offers Dark Star Orchestra without filtering to
 * it); those are left out, so the page never claims a filter that isn't there.
 */
function appliedChips(interp: Interpretation): string[] {
  if (!interp) return [];
  const applied = (key: string | null | undefined): boolean => {
    switch (key) {
      case 'artist':
        return !!interp.artist;
      case 'country':
        return !!interp.country;
      case 'soundboard':
        return !!interp.soundboard;
      case 'matrix':
        return !!interp.matrix;
      case 'chronological':
        return !!interp.chronological;
      case 'tour':
        return !!interp.tour_filter;
      default:
        return !!key && interp.numbers?.[key] !== undefined;
    }
  };
  return compact(
    (interp.chips ?? []).map((c) =>
      applied(c.key) ? (c.key === 'country' && c.label ? regionName(c.label) : c.label) : undefined
    )
  );
}

/** The catalog answered, but said search is unavailable (its index is down or rebuilding). */
class SearchUnavailableError extends Error {
  constructor() {
    super('Catalog search reported itself unavailable');
  }
}

const RESULT_SCOPES = SEARCH_SCOPES.filter((s): s is ResultScope => s !== 'all');

const results = defineResource({
  name: 'catalog-search',
  ttl: 5 * MINUTES,
  load: (q: string, scope: SearchScope, page: number, typing: 0 | 1) =>
    unwrap(
      getApiV4Search(
        { q, scope, page, typing: typing === 1 },
        { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) }
      )
    ),
  slim: async (raw): Promise<SearchResults> => {
    const r = responseSchema.parse(raw);
    // Thrown, not returned: a returned value would be cached, and the outage
    // would outlive the API's recovery. search() turns it into UNAVAILABLE_SEARCH.
    if (r.availability === 'unavailable') throw new SearchUnavailableError();
    const top = docs(r.top);
    const recordings = docs(r.sections?.sources);
    const reviews = docs(r.sections?.reviews);
    const page = docs(r.results);
    const look = await lookupsFor([...top, ...page]);
    const hits = (list: Doc[]) => {
      const seen = new Set<string>();
      return list.flatMap((d) => {
        const hit = toHit(d, look);
        if (!hit || seen.has(hit.id)) return [];
        seen.add(hit.id);
        return [hit];
      });
    };
    const counts: SearchResults['counts'] = {};
    for (const scope of RESULT_SCOPES) {
      const n = r.counts?.[scope];
      if (typeof n === 'number') counts[scope] = n;
    }
    return {
      availability: 'full',
      chips: appliedChips(r.interpretation),
      counts,
      top: hits(top),
      recordings: hits(recordings),
      reviews: hits(reviews),
      results: hits(page),
    };
  },
});

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
    return await results.get(query, scope, page, typing ? 1 : 0);
  } catch (err) {
    // 422: a query the API won't search (a value it rejects). Nothing to show, not an outage.
    if (err instanceof RelistenApiError && err.status === 422) return EMPTY_SEARCH;
    console.error('Search unavailable', err);
    return UNAVAILABLE_SEARCH;
  }
}
