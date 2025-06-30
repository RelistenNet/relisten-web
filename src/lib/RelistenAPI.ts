import ky from 'ky-universal';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { API_DOMAIN } from './constants';
import { sortSources } from './sortSources';
import type { Artist, Tape, Year, ArtistShows, Show, Day } from '@/types';

export class RelistenAPI {
  private static baseURL = API_DOMAIN;

  // Generic cached fetch method
  private static cachedFetch = cache(
    async <T>(
      endpoint: string,
      options: { revalidate?: number } = { revalidate: 60 * 5 }
    ): Promise<T> => {
      const url = `${this.baseURL}${endpoint}`;

      // console.log('Requesting', endpoint, options);

      try {
        const response = await ky(url, {
          next: options.revalidate ? { revalidate: options.revalidate } : undefined,
        }).json();

        return response as T;
      } catch (err) {
        console.error(`API fetch error for ${url}:`, err);
        notFound();
      }
    }
  );

  // Artists API
  static fetchArtists = cache(async (): Promise<Artist[]> => {
    return this.cachedFetch<Artist[]>('/api/v3/artists');
  });

  // Shows API
  static fetchShow = cache(
    async (
      slug?: string,
      year?: string,
      displayDate?: string
    ): Promise<Partial<Tape> | undefined> => {
      if (!slug || !year || !displayDate) return { sources: [] };

      const show = await this.cachedFetch<Tape>(
        `/api/v2/artists/${slug}/years/${year}/${displayDate}`
      );

      if (show?.sources?.length) {
        show.sources = sortSources(show.sources);
      }

      return show;
    }
  );

  static fetchShowByUUID = cache(async (showUuid: string): Promise<Partial<Tape> | undefined> => {
    if (!showUuid) return { sources: [] };

    const show = await this.cachedFetch<Tape>(`/api/v3/shows/${showUuid}`);

    if (show?.sources?.length) {
      show.sources = sortSources(show.sources);
    }

    return show;
  });

  static fetchRandomShow = cache(async (artistSlug: string): Promise<Partial<Tape> | undefined> => {
    if (!artistSlug) return undefined;

    // if doesnt match
    if (!/^[a-z-]+$/i.test(artistSlug)) {
      console.error('Tried to load url that doesnt match artist slug format:', artistSlug);

      return notFound();
    }

    return this.cachedFetch<Partial<Tape>>(`/api/v2/artists/${artistSlug}/shows/random`, {
      revalidate: 0,
    });
  });

  // Years API
  static fetchYears = cache(async (slug?: string): Promise<Year[]> => {
    if (!slug) return [];

    return this.cachedFetch<Year[]>(`/api/v2/artists/${slug}/years`);
  });

  // Artist Shows API
  static fetchShows = cache(
    async (slug?: string, year?: string): Promise<ArtistShows | undefined> => {
      if (!slug || !year) return undefined;

      return this.cachedFetch<ArtistShows>(`/api/v2/artists/${slug}/years/${year}`);
    }
  );

  // Today in History API
  static fetchTodayInHistory = cache(async (artistSlug?: string): Promise<Show[]> => {
    if (!artistSlug) return [];

    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    return this.cachedFetch<Show[]>(
      `/api/v2/artists/${artistSlug}/shows/on-date?month=${month}&day=${day}`
    );
  });

  static fetchTodayShows = cache(
    async (month: number | string, day: number | string): Promise<Day[]> => {
      return this.cachedFetch<Day[]>(`/api/v2/shows/today?month=${month}&day=${day}`);
    }
  );

  // Recently Added Shows API
  static fetchRecentlyAdded = cache(async (artistSlug?: string): Promise<Show[]> => {
    if (!artistSlug) return [];

    return this.cachedFetch<Show[]>(
      `/api/v2/artists/${artistSlug}/shows/recently-added`
    );
  });

  // Live API
  static fetchRecentlyPlayed = cache(async (): Promise<any[]> => {
    return this.cachedFetch<any[]>('/api/v2/live/recently_played', { revalidate: 0 });
  });

  static fetchLiveHistory = cache(async (lastSeenId?: string): Promise<any[]> => {
    const params = lastSeenId ? `?lastSeenId=${lastSeenId}` : '';
    return this.cachedFetch<any[]>(`/api/v2/live/history${params}`, { revalidate: 0 });
  });
}

export default RelistenAPI;
