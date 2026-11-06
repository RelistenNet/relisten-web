import 'server-only';

import { unwrap } from '@/api/fetcher';
import {
  getApiV4ArtistsArtistIdShows,
  getApiV4ArtistsArtistIdShowsByDateShowDate,
  getApiV4ArtistsArtistIdShowsOnDate,
  getApiV4ArtistsArtistIdShowsRandom,
  getApiV4ArtistsArtistIdShowsRecentlyAdded,
  getApiV4ArtistsArtistIdYearsByNumberYear,
  getApiV4ShowsOnDate,
  getApiV4ShowsShowId,
} from '@/api/generated/client';
import { sortSources, sortTracksInSources } from '@/lib/sortSources';
import type { ArtistShows, Tape } from '@/types';
import { toArtistShows, toTape } from './adapters';
import { defineResource, MINUTES, pathParam } from './resource';
import { toShowSummaries } from './summaries';

// Shows: full shows (tapes, sets, tracks) for show pages, and slim summaries for
// lists and tables.

/** Sources in display order, tracks in play order. Cached values are shared: sort before caching. */
const sorted = (tape: Tape): Tape => {
  if (tape.sources?.length) {
    tape.sources = sortSources(tape.sources);
    sortTracksInSources(tape.sources);
  }
  return tape;
};

export const showByDate = defineResource({
  name: 'show-by-date',
  ttl: 5 * MINUTES,
  load: (artistId: string, date: string) =>
    unwrap(getApiV4ArtistsArtistIdShowsByDateShowDate(artistId, pathParam(date))),
  slim: (show) => sorted(toTape(show)),
});

export const showById = defineResource({
  name: 'show',
  ttl: 5 * MINUTES,
  load: (showId: string) => unwrap(getApiV4ShowsShowId(showId)),
  slim: (show) => sorted(toTape(show)),
});

/** Uncached on purpose: every call should be a different show. */
export const randomShow = async (artistId: string) =>
  sorted(toTape(await unwrap(getApiV4ArtistsArtistIdShowsRandom(artistId))));

/** One year's shows, for the browse view's shows column. */
export const yearShows = defineResource({
  name: 'year-shows',
  ttl: 5 * MINUTES,
  load: (artistId: string, year: number) =>
    unwrap(getApiV4ArtistsArtistIdYearsByNumberYear(artistId, year)),
  slim: (year): ArtistShows => toArtistShows(year),
});

/** Every show an artist played (2,000+ for the Grateful Dead); tables page it. */
export const artistShows = defineResource({
  name: 'artist-shows',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdShows(artistId)),
  slim: toShowSummaries,
});

const RECENTLY_ADDED_LIMIT = 200;

export const recentlyAdded = defineResource({
  name: 'recently-added',
  ttl: 5 * MINUTES,
  load: (artistId: string) =>
    unwrap(
      getApiV4ArtistsArtistIdShowsRecentlyAdded(artistId, {
        limit: RECENTLY_ADDED_LIMIT,
        sort_by: 'created_at',
      })
    ),
  slim: toShowSummaries,
});

/** An artist's shows on a calendar date across the years. */
export const artistOnDate = defineResource({
  name: 'artist-on-date',
  ttl: 5 * MINUTES,
  load: (artistId: string, month: number, day: number) =>
    unwrap(getApiV4ArtistsArtistIdShowsOnDate(artistId, { month, day })),
  slim: toShowSummaries,
});

/** Every artist's shows on a calendar date (the Today page). */
export const onDate = defineResource({
  name: 'on-date',
  ttl: 5 * MINUTES,
  load: (month: number, day: number) => unwrap(getApiV4ShowsOnDate({ month, day })),
  slim: toShowSummaries,
});
