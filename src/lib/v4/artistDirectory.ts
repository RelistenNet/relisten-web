import 'server-only';

import { cache as timberCache } from '@timber-js/app/cache';
import { getApiV4Artists } from './generated/client';
import { toArtist } from './adapters';
import { unwrap } from './fetcher';
import type { Artist } from '@/types';

// Every slug-addressed page maps its artist slug to a v4 id through this. It
// loads once per process (concurrent first requests share that one fetch), then
// timber's cache serves it, refreshing in the background every 5 minutes.

export type ArtistDirectory = {
  artists: Artist[];
  bySlug: Map<string, Artist>;
  byId: Map<string, Artist>;
};

function index(artists: Artist[]): ArtistDirectory {
  const bySlug = new Map<string, Artist>();
  const byId = new Map<string, Artist>();
  for (const artist of artists) {
    if (artist.slug) bySlug.set(artist.slug, artist);
    byId.set(artist.id, artist);
  }
  return { artists, bySlug, byId };
}

export const getArtistDirectory = timberCache.data(
  async (): Promise<ArtistDirectory> => {
    const artists = await unwrap(getApiV4Artists({ include_autocreated: true }));
    return index(artists.map(toArtist));
  },
  {
    ttl: 60 * 5,
    key: () => 'v4:artist-directory',
    staleWhileRevalidate: true,
    tags: ['artists'],
  }
);

/** The artist for a URL slug, or undefined. */
export async function findArtistBySlug(slug: string | undefined): Promise<Artist | undefined> {
  if (!slug) return undefined;
  return (await getArtistDirectory()).bySlug.get(slug);
}
