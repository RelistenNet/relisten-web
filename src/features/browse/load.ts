import 'server-only';

import { cache } from 'react';
import { artistIdForSlug, findArtistBySlug, getArtistDirectory, years } from '@/data/artists';
import { artistOnDate, randomShow, showByDate, yearShows } from '@/data/shows';
import type { ShowDetail, ShowSummary, YearSummary } from '@/domain/types';

// Data for the browse view (artists → years → shows → a show). Each loader is
// cached per request, so the view's parallel columns share fetches: on /, the
// shows column and the songs column must get the *same* random show.

export const loadArtists = cache(async () => (await getArtistDirectory()).artists);

export const loadArtist = cache(findArtistBySlug);

/** A show by date, sources sorted; 404s for an unknown artist or show. */
export const loadShow = cache(async (artistSlug: string, date: string): Promise<ShowDetail> =>
  showByDate.orDeny(await artistIdForSlug(artistSlug), date)
);

/** A random show for an artist (the default view before a show is picked). */
export const loadRandomShow = cache(async (artistSlug: string): Promise<ShowDetail> =>
  randomShow(await artistIdForSlug(artistSlug))
);

export const loadYears = cache(async (artistId: string): Promise<YearSummary[]> =>
  years.orDeny(artistId)
);

const YEAR = /^\d{4}$/;

/** One year's shows (with lengths and popularity), straight from the URL's year. */
export const loadYearShows = cache(
  async (artistId: string, year: string): Promise<ShowSummary[] | undefined> =>
    YEAR.test(year) ? yearShows.orDeny(artistId, Number(year)) : undefined
);

/** The artist's shows on a calendar date (the years column's Today In History row). */
export const loadOnDate = cache(async (artistSlug: string, month: number, day: number) =>
  artistOnDate.orDeny(await artistIdForSlug(artistSlug), month, day)
);
