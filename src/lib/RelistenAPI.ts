import 'server-only';

import { cache } from 'react';
import { artistIdForSlug, findArtistBySlug, getArtistDirectory } from '@/data/artists';
import * as artistData from '@/data/artists';
import { livePlays, liveSummary } from '@/data/live';
import { search } from '@/data/search';
import * as shows from '@/data/shows';
import type { ShowSummary } from '@/domain/types';
import type { Artist, ArtistShows, Day, Tape, Year } from '@/types';

// The browse view's, live pages', and search's entry point to catalog data: a
// thin facade over the data layer (src/data), keeping the shapes those pages
// read. Detail pages live in src/features and load from src/data directly.
// This shrinks as the browse view moves to features too.

const YEAR = /^\d{4}$/;

const artistsById = async () => (await getArtistDirectory()).byId;

export class RelistenAPI {
  // Artists: from the cached directory.
  static fetchAllArtists = cache(
    async (): Promise<Artist[]> => (await getArtistDirectory()).artists
  );

  static findArtist = cache(findArtistBySlug);

  // Shows
  static fetchShow = cache(
    async (slug?: string, _year?: string, displayDate?: string): Promise<Tape> => {
      if (!slug || !displayDate) return { id: '', sources: [] };
      return shows.showByDate.orDeny(await artistIdForSlug(slug), displayDate);
    }
  );

  static fetchShowById = cache((showId: string) => shows.showById.orDeny(showId));

  static fetchRandomShow = cache(async (artistSlug?: string): Promise<Tape | undefined> => {
    if (!artistSlug) return undefined;
    return shows.randomShow(await artistIdForSlug(artistSlug));
  });

  static fetchYears = cache(async (artistId?: string): Promise<Year[]> =>
    artistId ? artistData.years.orDeny(artistId) : []
  );

  /** One year's shows, straight from the URL's year: no years-list lookup first. */
  static fetchYearShows = cache(
    async (artistId?: string, year?: string): Promise<ArtistShows | undefined> => {
      if (!artistId || !year || !YEAR.test(year)) return undefined;
      return shows.yearShows.orDeny(artistId, Number(year));
    }
  );

  /** An artist's shows on this calendar date across the years. */
  static fetchTodayInHistory = cache(
    async (artistSlug: string | undefined, month: number | string, day: number | string) => {
      if (!artistSlug) return [] as ShowSummary[];
      return shows.artistOnDate.orDeny(
        await artistIdForSlug(artistSlug),
        Number(month),
        Number(day)
      );
    }
  );

  /** Every artist's shows on a calendar date, for the Today page. */
  static fetchTodayShows = cache(async (month: number | string, day: number | string) => {
    const [list, byId] = await Promise.all([
      shows.onDate.orDeny(Number(month), Number(day)),
      artistsById(),
    ]);
    return list.map((s): Day => ({
      id: s.id,
      artist: byId.get(s.artistId),
      artist_id: s.artistId,
      venue: s.venue ? { id: s.id, ...s.venue } : undefined,
      display_date: s.date,
      source_count: s.tapes,
      has_soundboard_source: s.sbd,
    }));
  });

  static search = cache(search);

  // Live: never deny(); an empty result renders the empty state.
  static fetchLiveSummary = cache(liveSummary);
  static fetchLivePlays = cache(livePlays);
}

export default RelistenAPI;
