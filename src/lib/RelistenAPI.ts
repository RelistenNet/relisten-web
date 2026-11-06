import 'server-only';

import { deny } from '@timber-js/app/server';
import { cache } from 'react';
import { cache as timberCache } from '@timber-js/app/cache';
import { toMonthDay, type ApiLiveSummary, type LivePlay, type MonthDay } from './live';
import { sortSources, sortTracksInSources } from './sortSources';
import { toSourceParam } from './sourceParam';
import { toShowRow, type ShowRow } from './table/showRows';
import { EMPTY_SEARCH, type SearchArtist, type SearchItem, type SearchResults } from './search';
import {
  getApiV4ArtistsArtistIdShows,
  getApiV4ArtistsArtistIdShowsByDateShowDate,
  getApiV4ArtistsArtistIdShowsOnDate,
  getApiV4ArtistsArtistIdShowsRandom,
  getApiV4ArtistsArtistIdShowsRecentlyAdded,
  getApiV4ArtistsArtistIdSongs,
  getApiV4ArtistsArtistIdSongsBySlugSlug,
  getApiV4ArtistsArtistIdTours,
  getApiV4ArtistsArtistIdVenues,
  getApiV4ArtistsArtistIdYears,
  getApiV4ArtistsArtistIdYearsByNumberYear,
  getApiV4LiveHistory,
  getApiV4LiveSummary,
  getApiV4ShowsOnDate,
  getApiV4ImportedSongsImportedSongId,
  getApiV4ImportedVenuesImportedVenueId,
  getApiV4Search,
  getApiV4VenuesBySlugSlug,
  getApiV4ShowsShowId,
  getApiV4ToursTourId,
} from './v4/generated/client';
import type { ShowSummaryResource } from './v4/generated/model';
import { isMissingStatus, RelistenApiError, unwrap } from './v4/fetcher';
import {
  IMPORTED_VENUE_PREFIX,
  showVenue,
  toArtistShows,
  toShows,
  toTape,
  toTour,
  toYear,
  venueLocation,
} from './v4/adapters';
import { findArtistBySlug, getArtistDirectory, type ArtistDirectory } from './v4/artistDirectory';
import type { Artist, ArtistShows, Day, Show, Song, Tape, Tour, Venue, Year } from '@/types';

/**
 * Cross-request cache for a v4 read: 5 minutes, served stale while it refreshes.
 * The explicit key matters: timber can't derive a stable identity for calls made
 * through this helper. React cache() still dedupes within a render on top.
 */
function cachedV4<A extends (string | number)[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
  ttl = 60 * 5
) {
  return timberCache.data(fn, {
    ttl,
    key: (...args: A) => `v4:${name}:${args.join(':')}`,
    staleWhileRevalidate: true,
  });
}

/**
 * Orval's generated client interpolates path params as-is. Ids come from the
 * API itself, but dates and slugs can come from the URL's query string, so
 * encode those: a crafted value must not change which API path is called.
 */
const pathParam = (value: string) => encodeURIComponent(value);

/** A missing resource becomes a real 404; anything else (API down) propagates. */
async function orDeny<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof RelistenApiError && isMissingStatus(err.status)) deny(404);
    throw err;
  }
}

/** The v4 artist id for a URL slug; 404s for an unknown artist. */
async function artistIdForSlug(slug: string | undefined): Promise<string> {
  const artist = await findArtistBySlug(slug);
  if (!artist) deny(404);
  return artist.id;
}

const sortedTape = (tape: Tape): Tape => {
  if (tape.sources?.length) {
    tape.sources = sortSources(tape.sources);
    sortTracksInSources(tape.sources);
  }
  return tape;
};

const YEAR = /^\d{4}$/;

// ---------------------------------------------------------------------------
// Cached v4 fetchers. Results are shared across requests: never mutate them.
// ---------------------------------------------------------------------------

const fetchYearsV4 = cachedV4('years', async (artistId: string) =>
  (await unwrap(getApiV4ArtistsArtistIdYears(artistId))).map(toYear)
);

const fetchYearShowsV4 = cachedV4('year-shows', async (artistId: string, year: number) =>
  toArtistShows(await unwrap(getApiV4ArtistsArtistIdYearsByNumberYear(artistId, year)))
);

const fetchShowByDateV4 = cachedV4('show-by-date', async (artistId: string, date: string) =>
  sortedTape(
    toTape(await unwrap(getApiV4ArtistsArtistIdShowsByDateShowDate(artistId, pathParam(date))))
  )
);

const fetchShowByIdV4 = cachedV4('show', async (showId: string) =>
  sortedTape(toTape(await unwrap(getApiV4ShowsShowId(showId))))
);

const fetchArtistOnDateV4 = cachedV4(
  'artist-on-date',
  async (artistId: string, month: number, day: number) =>
    toShows(await unwrap(getApiV4ArtistsArtistIdShowsOnDate(artistId, { month, day })))
);

const fetchOnDateV4 = cachedV4('on-date', async (month: number, day: number) =>
  unwrap(getApiV4ShowsOnDate({ month, day }))
);

const fetchToursV4 = cachedV4('tours', async (artistId: string) =>
  (await unwrap(getApiV4ArtistsArtistIdTours(artistId))).map(toTour)
);

/** Songs: v4 mixes matched songs with songs only known from imported setlists. */
const fetchSongsV4 = cachedV4('songs', async (artistId: string): Promise<Song[]> => {
  const entries = await unwrap(getApiV4ArtistsArtistIdSongs(artistId));
  return entries.flatMap((e): Song[] => {
    if (e.song) {
      return [
        {
          id: e.song.id,
          name: e.song.name ?? undefined,
          slug: e.song.slug ?? undefined,
          shows_played_at: e.song.matched_show_count,
        },
      ];
    }
    if (e.imported_song) {
      return [
        {
          id: e.imported_song.id,
          canonical_id: e.imported_song.normalized_song_id ?? undefined,
          name: e.imported_song.name ?? undefined,
          slug: e.imported_song.slug ?? undefined,
          shows_played_at: e.imported_song.setlist_show_count,
        },
      ];
    }
    return [];
  });
});

const fetchVenuesV4 = cachedV4('venues', async (artistId: string): Promise<Venue[]> => {
  const entries = await unwrap(getApiV4ArtistsArtistIdVenues(artistId));
  return entries.flatMap((e): Venue[] => {
    const av = e.artist_venue;
    if (av) {
      return [
        {
          id: av.id,
          name: av.venue.name ?? undefined,
          slug: av.venue.slug ?? undefined,
          location: venueLocation(av.venue),
          shows_at_venue: av.artist_show_count,
          latitude: null,
          longitude: null,
        },
      ];
    }
    const iv = e.imported_venue;
    if (iv) {
      return [
        {
          id: iv.id,
          name: iv.name ?? undefined,
          slug: iv.id,
          location: iv.location ?? undefined,
          shows_at_venue: iv.show_count,
          latitude: null,
          longitude: null,
        },
      ];
    }
    return [];
  });
});

// ---------------------------------------------------------------------------
// Detail pages: a venue's or song's full show list, flattened into table rows.
// Cached whole; each request filters, sorts, and pages it (see lib/table).
// ---------------------------------------------------------------------------

export type VenueDetail = {
  id: string;
  name: string;
  location?: string;
  /** Other names this venue has gone by. */
  otherNames: string[];
  artistCount: number;
  rows: ShowRow[];
};

export type SongDetail = {
  id: string;
  /** The song's current slug; differs from the URL's for a merged song. */
  slug: string;
  name: string;
  /** Times played: one row each. */
  performances: number;
  /** Distinct shows; fewer than performances when a song repeats within a show. */
  shows: number;
  originalArtist?: string;
  aliases: string[];
  /** Setlist-only songs: v4 never matched tracks to these. */
  imported: boolean;
  rows: ShowRow[];
};

const showRows = (shows: ShowSummaryResource[] | null, directory: ArtistDirectory) =>
  (shows ?? []).flatMap((s) => toShowRow(s, directory) ?? []);

/** `venue` is a canonical venue slug, or an imported venue's id. */
const fetchVenueDetailV4 = cachedV4('venue-detail', async (venue: string): Promise<VenueDetail> => {
  const directory = await getArtistDirectory();
  if (venue.startsWith(IMPORTED_VENUE_PREFIX)) {
    const iv = await unwrap(getApiV4ImportedVenuesImportedVenueId(pathParam(venue)));
    return {
      id: iv.id,
      name: iv.name ?? 'Unknown venue',
      location: iv.location ?? undefined,
      otherNames: iv.past_names ? [iv.past_names] : [],
      artistCount: 1,
      rows: showRows(iv.shows, directory),
    };
  }
  const v = await unwrap(getApiV4VenuesBySlugSlug(pathParam(venue)));
  const rows = showRows(v.shows, directory);
  return {
    id: v.id,
    name: v.name ?? 'Unknown venue',
    location: venueLocation(v) || undefined,
    // Spelling variants ("Madison Sqaure Garden") are for matching, not display.
    otherNames: [
      ...new Set((v.names ?? []).filter((n) => n.kind !== 'spelling').map((n) => n.name ?? '')),
    ].filter((n) => n && n !== v.name),
    artistCount: new Set(rows.map((r) => r.artistSlug)).size,
    rows,
  };
});

// ---------------------------------------------------------------------------
// Artist show lists as table rows (top, recently added, on a date, a tour).
// ---------------------------------------------------------------------------

const RECENTLY_ADDED_LIMIT = 200;

const rowsFor = async (shows: Promise<ShowSummaryResource[]>) => {
  const [list, directory] = await Promise.all([shows, getArtistDirectory()]);
  return showRows(list, directory);
};

/** Every show an artist played: large (2,000+ for the Grateful Dead), so tables page it. */
const fetchAllShowRowsV4 = cachedV4('all-show-rows', async (artistId: string) =>
  rowsFor(unwrap(getApiV4ArtistsArtistIdShows(artistId)))
);

const fetchRecentlyAddedRowsV4 = cachedV4('recently-added-rows', async (artistId: string) =>
  rowsFor(
    unwrap(
      getApiV4ArtistsArtistIdShowsRecentlyAdded(artistId, {
        limit: RECENTLY_ADDED_LIMIT,
        sort_by: 'created_at',
      })
    )
  )
);

const fetchOnDateRowsV4 = cachedV4(
  'on-date-rows',
  async (artistId: string, month: number, day: number) =>
    rowsFor(unwrap(getApiV4ArtistsArtistIdShowsOnDate(artistId, { month, day })))
);

export type TourDetail = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  rows: ShowRow[];
};

const fetchTourDetailV4 = cachedV4('tour-detail', async (tourId: string): Promise<TourDetail> => {
  const [tour, directory] = await Promise.all([
    unwrap(getApiV4ToursTourId(tourId)),
    getArtistDirectory(),
  ]);
  return {
    id: tour.id,
    name: tour.name ?? 'Unknown tour',
    startDate: tour.start_date?.slice(0, 10),
    endDate: tour.end_date?.slice(0, 10),
    rows: showRows(tour.shows, directory),
  };
});

const importedSongDetail = async (songId: string): Promise<SongDetail> => {
  const [song, directory] = await Promise.all([
    unwrap(getApiV4ImportedSongsImportedSongId(songId)),
    getArtistDirectory(),
  ]);
  const rows = showRows(song.shows, directory);
  return {
    id: song.id,
    slug: song.slug ?? '',
    name: song.name ?? 'Unknown song',
    performances: rows.length,
    shows: rows.length,
    aliases: [],
    imported: true,
    rows,
  };
};

/**
 * A song's page data in one request: the song by slug, with each show's
 * matching files from its best tape (`include_tracks=top`, ranked like
 * sortSources). Merged slugs return the surviving song; the page redirects
 * when the returned slug differs from the URL.
 */
const fetchSongBySlugV4 = cachedV4(
  'song-by-slug',
  async (artistId: string, songSlug: string): Promise<SongDetail> => {
    const [song, directory] = await Promise.all([
      unwrap(
        getApiV4ArtistsArtistIdSongsBySlugSlug(artistId, pathParam(songSlug), {
          include_tracks: 'top',
        })
      ),
      getArtistDirectory(),
    ]);
    // A row per performance: a song can be played several times in one show
    // (Tweezer Reprise six times at SPAC 2025-07-27). Each file on the top tape
    // is one performance.
    const rows = (song.shows ?? []).flatMap((entry): ShowRow[] => {
      const row = toShowRow(entry.show, directory);
      if (!row) return [];
      const { single_song, multi_song } = entry.timings;
      // No single-song file on any tape: every file also holds other songs (a
      // segue), so lengths overstate the song; marked "~".
      const approx = !single_song && !!multi_song;
      const files = entry.tracks ?? [];
      const track = (file: (typeof files)[number]) => ({
        id: file.id,
        title: file.title ?? song.name ?? '',
        slug: file.slug ?? '',
        mp3Url: file.mp3_url ?? null,
        duration: file.duration,
        sourceId: file.source_id,
      });

      // Played once: the median across every tape is a steadier length than
      // the one file.
      if (files.length <= 1) {
        return [
          {
            ...row,
            track: files[0] ? track(files[0]) : undefined,
            songDuration: single_song?.median ?? multi_song?.median ?? null,
            songDurationApprox: approx,
            trackTitle: files[0]?.title ?? undefined,
          },
        ];
      }
      return files.map((file, i) => ({
        ...row,
        id: `${row.showId}:${file.id}`,
        track: track(file),
        songDuration: file.duration,
        songDurationApprox: approx,
        trackTitle: file.title ?? undefined,
        performance: { index: i + 1, of: files.length },
      }));
    });
    return {
      id: song.id,
      slug: song.slug ?? songSlug,
      name: song.name ?? 'Unknown song',
      performances: rows.length,
      shows: new Set(rows.map((r) => r.showId)).size,
      originalArtist: song.original_artist ?? undefined,
      aliases: song.aliases ?? [],
      imported: false,
      rows,
    };
  }
);

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const searchV4 = cachedV4('search', async (q: string): Promise<SearchResults> => {
  const [results, directory] = await Promise.all([
    unwrap(getApiV4Search({ q, artists: true, songs: true, venues: true, tours: true })),
    getArtistDirectory(),
  ]);
  const slimArtist = (artistId: string): SearchArtist | undefined => {
    const a = directory.byId.get(artistId);
    return a?.slug
      ? { name: a.name ?? a.slug, slug: a.slug, featured: a.featured ?? 0 }
      : undefined;
  };
  const item = (
    artistId: string,
    name: string | null,
    slug: string | null,
    show_count: number,
    location?: string
  ): SearchItem[] => {
    const artist = slimArtist(artistId);
    return artist && name && slug ? [{ name, slug, show_count, location, artist }] : [];
  };

  return {
    artists: (results.artists ?? []).flatMap((a) => {
      const artist = slimArtist(a.id);
      return artist ? [artist] : [];
    }),
    songs: (results.songs ?? []).flatMap((e) =>
      e.song
        ? item(e.song.artist_id, e.song.name, e.song.slug, e.song.matched_show_count)
        : e.imported_song
          ? item(
              e.imported_song.artist_id,
              e.imported_song.name,
              e.imported_song.slug,
              e.imported_song.setlist_show_count
            )
          : []
    ),
    venues: (results.venues ?? []).flatMap((e) => {
      const av = e.artist_venue;
      if (av) {
        return item(
          av.artist_id,
          av.venue.name,
          av.venue.slug,
          av.artist_show_count,
          venueLocation(av.venue)
        );
      }
      const iv = e.imported_venue;
      return iv ? item(iv.artist_id, iv.name, iv.id, iv.show_count, iv.location ?? undefined) : [];
    }),
    tours: (results.tours ?? []).flatMap((t) => item(t.artist_id, t.name, t.slug, t.show_count)),
  };
});

// ---------------------------------------------------------------------------
// Live. Short TTLs; these throw rather than return a fallback, so a failure is
// never cached and timber keeps serving the last good entry while it retries.
// ---------------------------------------------------------------------------

/** How many recent plays the server keeps for the feed; clients filter by sequence. */
const LIVE_HISTORY_BUFFER = 200;

const fetchLiveHistoryV4 = timberCache.data(
  async () => unwrap(getApiV4LiveHistory({ limit: LIVE_HISTORY_BUFFER })),
  { ttl: 3, key: () => 'v4:live-history', staleWhileRevalidate: true }
);

// The summary's window advances once a minute (the API aligns it to whole
// minutes), so refetching more often than every 30s buys nothing.
const fetchLiveSummaryV4 = timberCache.data(
  async (monthDay: string) =>
    // Only the artists list is used: ask for every artist and as few show rows as allowed.
    unwrap(
      getApiV4LiveSummary({
        minutes: 15,
        sort: 'plays',
        artists_limit: 100,
        shows_limit: 1,
        max_per_artist: 1,
        month_day: monthDay,
      })
    ),
  { ttl: 30, key: (monthDay: string) => `v4:live-summary:${monthDay}`, staleWhileRevalidate: true }
);

const artistOf = (directory: ArtistDirectory, artistId: string) => directory.byId.get(artistId);

function toLivePlays(
  items: Awaited<ReturnType<typeof fetchLiveHistoryV4>>,
  directory: ArtistDirectory
): LivePlay[] {
  const plays: LivePlay[] = [];
  for (const item of items) {
    const artist = artistOf(directory, item.show.artist_id);
    const displayDate = item.show.display_date;
    if (!artist?.slug || !displayDate) continue;
    plays.push({
      id: item.sequence,
      playedAt: Date.parse(item.played_at),
      trackTitle: item.track.title ?? '',
      trackSlug: item.track.slug ?? '',
      sourceParam: toSourceParam(item.track.source_id),
      displayDate,
      artistName: artist.name ?? artist.slug,
      artistSlug: artist.slug,
    });
  }
  return plays;
}

const toDay = (show: ShowSummaryResource, directory: ArtistDirectory): Day => ({
  id: show.id,
  artist: artistOf(directory, show.artist_id),
  artist_id: show.artist_id,
  venue: showVenue(show),
  display_date: show.display_date ?? undefined,
  date: show.date,
  source_count: show.source_count,
  avg_rating: show.avg_rating,
  avg_duration: show.avg_duration ?? undefined,
  has_soundboard_source: show.has_soundboard_source,
});

export class RelistenAPI {
  // Artists — from the warm directory, never a request on the hot path.
  static fetchAllArtists = cache(async (): Promise<Artist[]> => {
    return (await getArtistDirectory()).artists;
  });

  static findArtist = cache(findArtistBySlug);

  // Shows
  static fetchShow = cache(
    async (slug?: string, _year?: string, displayDate?: string): Promise<Tape> => {
      if (!slug || !displayDate) return { id: '', sources: [] };
      const artistId = await artistIdForSlug(slug);
      return orDeny(fetchShowByDateV4(artistId, displayDate));
    }
  );

  static fetchShowById = cache(async (showId: string): Promise<Tape> => {
    return orDeny(fetchShowByIdV4(showId));
  });

  // Uncached on purpose: every call should be a different show.
  static fetchRandomShow = cache(async (artistSlug?: string): Promise<Tape | undefined> => {
    if (!artistSlug) return undefined;
    const artistId = await artistIdForSlug(artistSlug);
    const show = await orDeny(unwrap(getApiV4ArtistsArtistIdShowsRandom(artistId)));
    return sortedTape(toTape(show));
  });

  // Years
  static fetchYears = cache(async (artistId?: string): Promise<Year[]> => {
    if (!artistId) return [];
    return orDeny(fetchYearsV4(artistId));
  });

  /** One year's shows, straight from the URL's year: no years-list lookup first. */
  static fetchYearShows = cache(
    async (artistId?: string, year?: string): Promise<ArtistShows | undefined> => {
      if (!artistId || !year || !YEAR.test(year)) return undefined;
      return orDeny(fetchYearShowsV4(artistId, Number(year)));
    }
  );

  // Today in History
  static fetchTodayInHistory = cache(
    async (
      artistSlug: string | undefined,
      month: number | string,
      day: number | string
    ): Promise<Show[]> => {
      if (!artistSlug) return [];
      const artistId = await artistIdForSlug(artistSlug);
      return orDeny(fetchArtistOnDateV4(artistId, Number(month), Number(day)));
    }
  );

  static fetchTodayShows = cache(
    async (month: number | string, day: number | string): Promise<Day[]> => {
      const [shows, directory] = await Promise.all([
        orDeny(fetchOnDateV4(Number(month), Number(day))),
        getArtistDirectory(),
      ]);
      return shows.map((show) => toDay(show, directory));
    }
  );

  // Tours (v4)
  static fetchTours = cache(async (artistSlug?: string): Promise<Tour[]> => {
    if (!artistSlug) return [];
    return orDeny(fetchToursV4(await artistIdForSlug(artistSlug)));
  });

  // Songs (v4). Slugs are v4's; pre-v4 slugs for merged/renamed songs 404.
  static fetchSongs = cache(async (artistSlug?: string): Promise<Song[]> => {
    if (!artistSlug) return [];
    return orDeny(fetchSongsV4(await artistIdForSlug(artistSlug)));
  });

  // Venues
  static fetchVenues = cache(async (artistSlug?: string): Promise<Venue[]> => {
    if (!artistSlug) return [];
    return orDeny(fetchVenuesV4(await artistIdForSlug(artistSlug)));
  });

  // Detail pages
  static fetchVenueDetail = cache(async (venue: string): Promise<VenueDetail> => {
    return orDeny(fetchVenueDetailV4(venue));
  });

  /**
   * One request for canonical songs (by slug). Only slugs the API doesn't know
   * as canonical songs (imported, setlist-only songs) fall back to the songs
   * list: an imported song linked to a canonical one returns that song (its
   * slug differs, so the page redirects); otherwise the imported song.
   */
  static fetchSongDetail = cache(
    async (artistSlug: string, songSlug: string): Promise<SongDetail> => {
      const artistId = await artistIdForSlug(artistSlug);
      try {
        return await fetchSongBySlugV4(artistId, songSlug);
      } catch (err) {
        if (!(err instanceof RelistenApiError && isMissingStatus(err.status))) throw err;
      }
      const songs = await RelistenAPI.fetchSongs(artistSlug);
      const song = songs.find((s) => s.slug === songSlug);
      if (!song?.id.startsWith('imported_song_')) deny(404);
      const canonicalSlug = song.canonical_id
        ? songs.find((s) => s.id === song.canonical_id)?.slug
        : undefined;
      if (canonicalSlug) return orDeny(fetchSongBySlugV4(artistId, canonicalSlug));
      return orDeny(importedSongDetail(song.id));
    }
  );

  // Artist show lists (detail pages)
  static fetchAllShowRows = cache(async (artistSlug: string) =>
    orDeny(fetchAllShowRowsV4(await artistIdForSlug(artistSlug)))
  );

  static fetchRecentlyAddedRows = cache(async (artistSlug: string) =>
    orDeny(fetchRecentlyAddedRowsV4(await artistIdForSlug(artistSlug)))
  );

  static fetchOnDateRows = cache(async (artistSlug: string, month: number, day: number) =>
    orDeny(fetchOnDateRowsV4(await artistIdForSlug(artistSlug), month, day))
  );

  /** Tour slugs are stable in v4; the cached tour list maps slug → id. */
  static fetchTourDetail = cache(async (artistSlug: string, tourSlug: string) => {
    const tours = await RelistenAPI.fetchTours(artistSlug);
    const tour = tours.find((t) => t.slug === tourSlug);
    if (!tour) deny(404);
    return orDeny(fetchTourDetailV4(tour.id));
  });

  /** Empty for queries under two characters, and when the API is unavailable. */
  static search = cache(async (q: string): Promise<SearchResults> => {
    if (q.length < 2) return EMPTY_SEARCH;
    try {
      return await searchV4(q.toLowerCase());
    } catch (err) {
      console.error('Search unavailable', err);
      return EMPTY_SEARCH;
    }
  });

  // Live — never deny(); an empty result just renders the empty state.
  /** Null when the API is unavailable (and nothing good is cached); callers decide how to degrade. */
  static fetchLiveSummary = cache(async (today: MonthDay): Promise<ApiLiveSummary | null> => {
    try {
      const [summary, directory] = await Promise.all([
        fetchLiveSummaryV4(toMonthDay(today)),
        getArtistDirectory(),
      ]);
      return {
        window_minutes: summary.window_minutes,
        listened_seconds: summary.listened_seconds,
        artists: (summary.artists ?? []).flatMap((a) => {
          const artist = artistOf(directory, a.artist_id);
          if (!artist?.slug) return [];
          const top = a.top_show;
          return [
            {
              artist_id: a.artist_id,
              name: artist.name ?? artist.slug,
              slug: artist.slug,
              listened_seconds: a.listened_seconds,
              show_count: a.show_count,
              top_show: top?.show.display_date
                ? {
                    listened_seconds: top.listened_seconds,
                    display_date: top.show.display_date,
                    venue_name: showVenue(top.show)?.name,
                    source_param: toSourceParam(top.source.id),
                  }
                : null,
            },
          ];
        }),
      };
    } catch (err) {
      console.error('Live summary unavailable', err);
      return null;
    }
  });

  /**
   * Recent plays, newest first, after `afterSequence` when given. Every caller
   * shares one cached upstream read, however many browsers are polling.
   * Empty when the API is unavailable; the feed fills in from later polls.
   */
  static fetchLivePlays = cache(async (afterSequence = 0, limit = 30): Promise<LivePlay[]> => {
    try {
      const [items, directory] = await Promise.all([fetchLiveHistoryV4(), getArtistDirectory()]);
      return toLivePlays(items, directory)
        .filter((p) => p.id > afterSequence)
        .slice(0, limit);
    } catch (err) {
      console.error('Live history unavailable', err);
      return [];
    }
  });
}

export default RelistenAPI;
