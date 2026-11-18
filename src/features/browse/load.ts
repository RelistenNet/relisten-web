import 'server-only';

import { cache } from 'react';
import { deny, redirect } from '@timber-js/app/server';
import { artistIdForSlug, findArtistBySlug, getArtistDirectory, years } from '@/data/artists';
import { artistOnDate, randomShow, showByDate, yearShows } from '@/data/shows';
import type { ShowDetail, ShowSummary, YearSummary } from '@/domain/types';
import { songsProjection, tapeWithTrack } from '@/lib/showProjection';
import { activeTape } from '@/lib/sortSources';
import type { SearchParamsDefinition } from '@timber-js/app/search-params';
import { toSourceParam } from '@/lib/sourceParam';
import { createShowDate } from '@/lib/utils';
import { trackHref, type TrackRoute } from '@/ui/shows/trackHref';

// Data for the browse view (artists → years → shows → a show). Each loader is
// cached per request, so the view's parallel columns share fetches: on /, the
// shows column and the songs column must get the *same* random show.

export const loadArtists = cache(async () => (await getArtistDirectory()).artists);

export const loadArtist = cache(findArtistBySlug);

/** An artist's display name; 404s for an unknown artist. */
export const loadArtistName = cache(async (artistSlug: string): Promise<string> => {
  const artist = await loadArtist(artistSlug);
  if (!artist) deny(404);
  return artist.name;
});

/**
 * A show by date, sources sorted; 404s for an unknown artist or show. A show
 * the API has no date for takes the URL's, so its tracks' queue items and
 * links still name the show.
 */
export const loadShow = cache(async (artistSlug: string, date: string): Promise<ShowDetail> => {
  const show = await showByDate.orDeny(await artistIdForSlug(artistSlug), date);
  return show.date ? show : { ...show, date };
});

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

type TrackPageParams = {
  artistSlug: string;
  year: string;
  month: string;
  day: string;
  songSlug: string;
};

/**
 * A track page's show, and the tape it plays: the one `?source=` names, or
 * the top-sorted one. 404s for an unknown show, or a song no tape has. When
 * that tape lacks the song, redirects to the first tape that has it, so the
 * URL, the track list and the player agree on one tape.
 *
 * `query` is the page's search params (`trackSearchParams`, or an extension of
 * it), so the redirect changes only the tape and keeps `?t=` and the rest.
 */
export async function loadTrackPage<Q extends { source: string }>(
  route: TrackRoute,
  params: TrackPageParams,
  query: SearchParamsDefinition<Q>
) {
  const { artistSlug, year, month, day, songSlug } = params;
  const date = createShowDate(year, month, day);
  const [show, artistName] = await Promise.all([
    loadShow(artistSlug, date),
    loadArtistName(artistSlug),
  ]);
  const songs = songsProjection(show);
  const values = query.get();
  const active = activeTape(songs.sources, values.source);
  const tape = tapeWithTrack(songs.sources, active, songSlug);
  if (!tape) deny(404);
  if (tape !== active) {
    const kept = query.buildSearchParams({ ...values, source: toSourceParam(tape.id) });
    redirect(trackHref(route, params, kept));
  }
  return {
    songs,
    tape,
    show: { id: songs.id, date: songs.date, venue: songs.venue },
    artistName,
  };
}
