import 'server-only';

import { unwrap } from '@/api/fetcher';
import { getApiV4Search } from '@/api/generated/client';
import { EMPTY_SEARCH, type SearchArtist, type SearchItem, type SearchResults } from '@/lib/search';
import { venueLocation } from './adapters';
import { getArtistDirectory } from './artists';
import { defineResource, MINUTES } from './resource';

const results = defineResource({
  name: 'search',
  ttl: 5 * MINUTES,
  load: (q: string) =>
    Promise.all([
      unwrap(getApiV4Search({ q, artists: true, songs: true, venues: true, tours: true })),
      getArtistDirectory(),
    ]),
  slim: ([r, directory]): SearchResults => {
    const slimArtist = (artistId: string): SearchArtist | undefined => {
      const a = directory.byId.get(artistId);
      return a ? { name: a.name, slug: a.slug, featured: a.featured } : undefined;
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
      artists: (r.artists ?? []).flatMap((a) => slimArtist(a.id) ?? []),
      songs: (r.songs ?? []).flatMap((e) =>
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
      // Canonical venues link by slug; imported-only venues by id.
      venues: (r.venues ?? []).flatMap((e) => {
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
        return iv
          ? item(iv.artist_id, iv.name, iv.id, iv.show_count, iv.location ?? undefined)
          : [];
      }),
      tours: (r.tours ?? []).flatMap((t) => item(t.artist_id, t.name, t.slug, t.show_count)),
    };
  },
});

/** Empty for queries under two characters, and when the API is unavailable. */
export async function search(q: string): Promise<SearchResults> {
  if (q.length < 2) return EMPTY_SEARCH;
  try {
    return await results.get(q.toLowerCase());
  } catch (err) {
    console.error('Search unavailable', err);
    return EMPTY_SEARCH;
  }
}
