import 'server-only';

import ky, { HTTPError } from 'ky';
import { deny } from '@timber-js/app/server';
import { cache } from 'react';
import { cache as timberCache } from '@timber-js/app/cache';
import { SERVER_API_DOMAIN } from './constants';
import { sortSources, sortTracksInSources } from './sortSources';
import type {
  Artist,
  Tape,
  Year,
  ArtistShows,
  Show,
  Day,
  Venue,
  Song,
  Tour,
  VenueWithShows,
  SongWithShows,
  TourWithShows,
  LiveHistoryItem,
} from '@/types';

// Tagged template that URL-encodes every interpolated value, so route params
// can't inject path segments or query strings into backend API URLs.
function safeApiPath(strings: TemplateStringsArray, ...values: Array<string | number>): string {
  return strings.reduce(
    (acc, str, i) => acc + str + (i < values.length ? encodeURIComponent(values[i]) : ''),
    ''
  );
}

// Cross-request cached fetch — caches API responses in memory with TTL.
// React cache() still deduplicates within a single render pass on top of this.
async function apiFetch<T>(endpoint: string): Promise<T> {
  const url = `${SERVER_API_DOMAIN}${endpoint}`;

  try {
    const response = await ky(url).json();
    return response as T;
  } catch (err) {
    if (err instanceof HTTPError && err.response.status === 404) {
      console.log(`404: ${url}`);
    } else {
      console.error(`API fetch error for ${url}`);
    }
    deny(404);
  }
}

const cachedApiFetch = timberCache.data(apiFetch, {
  ttl: 60 * 5, // 5 minutes
  key: (endpoint: string) => `api:${endpoint}`,
  staleWhileRevalidate: true,
});

export class RelistenAPI {
  private static baseURL = SERVER_API_DOMAIN;

  // Validate artist slug format
  private static isValidArtistSlug(slug: string): boolean {
    return /^[a-z-\d]+$/i.test(slug);
  }

  // Artists API
  static fetchArtists = cache(async (): Promise<Artist[]> => {
    return cachedApiFetch<Artist[]>('/api/v3/artists');
  });

  static fetchAllArtists = cache(async (): Promise<Artist[]> => {
    return cachedApiFetch<Artist[]>('/api/v3/artists?include_autocreated=true');
  });

  // Shows API
  static fetchShow = cache(
    async (
      slug?: string,
      year?: string,
      displayDate?: string
    ): Promise<Partial<Tape> | undefined> => {
      if (!slug || !year || !displayDate) return { sources: [] };

      const show = await cachedApiFetch<Tape>(
        safeApiPath`/api/v2/artists/${slug}/years/${year}/${displayDate}`
      );

      if (show?.sources?.length) {
        show.sources = sortSources(show.sources);
        sortTracksInSources(show.sources);
      }

      return show;
    }
  );

  static fetchShowByUUID = cache(async (showUuid: string): Promise<Partial<Tape> | undefined> => {
    if (!showUuid) return { sources: [] };

    const show = await cachedApiFetch<Tape>(safeApiPath`/api/v3/shows/${showUuid}`);

    if (show?.sources?.length) {
      show.sources = sortSources(show.sources);
      sortTracksInSources(show.sources);
    }

    return show;
  });

  static fetchRandomShow = cache(
    async (artistSlug?: string): Promise<Partial<Tape> | undefined> => {
      if (!artistSlug) return undefined;

      if (!this.isValidArtistSlug(artistSlug)) {
        console.error('Tried to load url that doesnt match artist slug format:', artistSlug);
        return deny(404);
      }

      return apiFetch<Partial<Tape>>(safeApiPath`/api/v2/artists/${artistSlug}/shows/random`);
    }
  );

  // Years API (v3 — UUID-based, includes popularity)
  static fetchYears = cache(async (artistUuid?: string): Promise<Year[]> => {
    if (!artistUuid) return [];

    return cachedApiFetch<Year[]>(safeApiPath`/api/v3/artists/${artistUuid}/years`);
  });

  // Artist Shows API (v3 — UUID-based, includes popularity)
  static fetchShows = cache(
    async (artistUuid?: string, yearUuid?: string): Promise<ArtistShows | undefined> => {
      if (!artistUuid || !yearUuid) return undefined;

      return cachedApiFetch<ArtistShows>(
        safeApiPath`/api/v3/artists/${artistUuid}/years/${yearUuid}`
      );
    }
  );

  // Today in History API
  static fetchTodayInHistory = cache(
    async (
      artistSlug: string | undefined,
      month: number | string,
      day: number | string
    ): Promise<Show[]> => {
      if (!artistSlug) return [];

      return cachedApiFetch<Show[]>(
        safeApiPath`/api/v2/artists/${artistSlug}/shows/on-date?month=${month}&day=${day}`
      );
    }
  );

  static fetchTodayShows = cache(
    async (month: number | string, day: number | string): Promise<Day[]> => {
      return cachedApiFetch<Day[]>(safeApiPath`/api/v2/shows/today?month=${month}&day=${day}`);
    }
  );

  // Top Shows API (sorted by rating)
  static fetchTopShows = cache(async (artistSlug?: string): Promise<Show[]> => {
    if (!artistSlug) return [];

    return cachedApiFetch<Show[]>(safeApiPath`/api/v2/artists/${artistSlug}/shows/top`);
  });

  // Recently Added Shows API
  static fetchRecentlyAdded = cache(async (artistSlug?: string): Promise<Show[]> => {
    if (!artistSlug) return [];

    return cachedApiFetch<Show[]>(safeApiPath`/api/v2/artists/${artistSlug}/shows/recently-added`);
  });

  // Venues API
  static fetchVenues = cache(async (artistSlug?: string): Promise<Venue[]> => {
    if (!artistSlug) return [];

    return cachedApiFetch<Venue[]>(safeApiPath`/api/v2/artists/${artistSlug}/venues`);
  });

  // Songs API
  static fetchSongs = cache(async (artistSlug?: string): Promise<Song[]> => {
    if (!artistSlug) return [];

    return cachedApiFetch<Song[]>(safeApiPath`/api/v2/artists/${artistSlug}/songs`);
  });

  // Tours API
  static fetchTours = cache(async (artistSlug?: string): Promise<Tour[]> => {
    if (!artistSlug) return [];

    return cachedApiFetch<Tour[]>(safeApiPath`/api/v2/artists/${artistSlug}/tours`);
  });

  // Detail endpoints — v3, slug-based
  static fetchVenueShows = cache(async (artistSlug: string, venueSlug: string) => {
    return cachedApiFetch<VenueWithShows>(
      safeApiPath`/api/v3/artists/${artistSlug}/venues/${venueSlug}`
    );
  });

  static fetchSongShows = cache(async (artistSlug: string, songSlug: string) => {
    return cachedApiFetch<SongWithShows>(
      safeApiPath`/api/v3/artists/${artistSlug}/songs/${songSlug}`
    );
  });

  static fetchTourShows = cache(async (artistSlug: string, tourSlug: string) => {
    return cachedApiFetch<TourWithShows>(
      safeApiPath`/api/v3/artists/${artistSlug}/tours/${tourSlug}`
    );
  });

  // Live API
  static fetchRecentlyPlayed = cache(async (): Promise<any[]> => {
    return apiFetch<any[]>('/api/v2/live/recently_played');
  });

  static fetchLiveHistory = cache(async (lastSeenId?: string): Promise<LiveHistoryItem[]> => {
    return apiFetch<LiveHistoryItem[]>(
      lastSeenId
        ? safeApiPath`/api/v2/live/history?lastSeenId=${lastSeenId}`
        : '/api/v2/live/history'
    );
  });
}

export default RelistenAPI;
