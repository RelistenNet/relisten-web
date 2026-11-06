import 'server-only';

import { cache } from 'react';
import { artistIdForSlug, findArtistBySlug, getArtistDirectory } from '@/data/artists';
import * as artistData from '@/data/artists';
import { livePlays, liveSummary } from '@/data/live';
import { search } from '@/data/search';
import * as shows from '@/data/shows';
import { songDetail } from '@/data/songs';
import { tourDetail } from '@/data/tours';
import { venueDetail } from '@/data/venues';
import type { ShowSummary } from '@/domain/types';
import type { Artist, ArtistShows, Day, Song, Tape, Tour, Venue, Year } from '@/types';
import { showRows, songRows, type ShowRow } from './table/showRows';

// The app's entry point to catalog data: a thin facade over the data layer
// (src/data), keeping the shapes existing pages read. Detail pages get table
// rows here, built per request from cached domain data.

const YEAR = /^\d{4}$/;

const artistsById = async () => (await getArtistDirectory()).byId;

export type VenueDetailRows = {
  id: string;
  name: string;
  location?: string;
  otherNames: string[];
  artistCount: number;
  rows: ShowRow[];
};

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

  // Per-artist lists
  static fetchTours = cache(async (artistSlug?: string): Promise<Tour[]> =>
    artistSlug ? artistData.tours.orDeny(await artistIdForSlug(artistSlug)) : []
  );

  static fetchSongs = cache(async (artistSlug?: string): Promise<Song[]> =>
    artistSlug ? artistData.songs.orDeny(await artistIdForSlug(artistSlug)) : []
  );

  static fetchVenues = cache(async (artistSlug?: string): Promise<Venue[]> =>
    artistSlug ? artistData.venues.orDeny(await artistIdForSlug(artistSlug)) : []
  );

  // Detail pages: rows built per request from cached domain data.
  static fetchVenueDetail = cache(async (venue: string): Promise<VenueDetailRows> => {
    const [detail, byId] = await Promise.all([venueDetail(venue), artistsById()]);
    const rows = showRows(detail.shows, byId);
    return {
      id: detail.id,
      name: detail.name,
      location: detail.location,
      otherNames: detail.otherNames,
      artistCount: new Set(rows.map((r) => r.artistSlug)).size,
      rows,
    };
  });

  static fetchSongDetail = cache(async (artistSlug: string, songSlug: string) => {
    const [song, byId] = await Promise.all([songDetail(artistSlug, songSlug), artistsById()]);
    const rows = songRows(song, byId);
    return {
      ...song,
      /** Times played: one row each. */
      performances: rows.length,
      /** Distinct shows; fewer than performances when a song repeats within a show. */
      shows: new Set(rows.map((r) => r.showId)).size,
      rows,
    };
  });

  static fetchTourDetail = cache(async (artistSlug: string, tourSlug: string) => {
    const [tour, byId] = await Promise.all([tourDetail(artistSlug, tourSlug), artistsById()]);
    return { ...tour, rows: showRows(tour.shows, byId) };
  });

  static fetchAllShowRows = cache(async (artistSlug: string) => {
    const [list, byId] = await Promise.all([
      shows.artistShows.orDeny(await artistIdForSlug(artistSlug)),
      artistsById(),
    ]);
    return showRows(list, byId);
  });

  static fetchRecentlyAddedRows = cache(async (artistSlug: string) => {
    const [list, byId] = await Promise.all([
      shows.recentlyAdded.orDeny(await artistIdForSlug(artistSlug)),
      artistsById(),
    ]);
    return showRows(list, byId);
  });

  static fetchOnDateRows = cache(async (artistSlug: string, month: number, day: number) => {
    const [list, byId] = await Promise.all([
      RelistenAPI.fetchTodayInHistory(artistSlug, month, day),
      artistsById(),
    ]);
    return showRows(list, byId);
  });

  static search = cache(search);

  // Live: never deny(); an empty result renders the empty state.
  static fetchLiveSummary = cache(liveSummary);
  static fetchLivePlays = cache(livePlays);
}

export default RelistenAPI;
