import 'server-only';

import { deny } from '@timber-js/app/server';
import { unwrap } from '@/api/fetcher';
import {
  getApiV4Artists,
  getApiV4ArtistsArtistIdSongs,
  getApiV4ArtistsArtistIdTours,
  getApiV4ArtistsArtistIdVenues,
  getApiV4ArtistsArtistIdYears,
} from '@/api/generated/client';
import type { Artist, Song, Tour, Venue, Year } from '@/types';
import { toArtist, toTour, toYear, venueLocation } from './adapters';
import { defineResource, MINUTES } from './resource';

// Artists and their per-artist lists (years, songs, venues, tours).

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

/**
 * Every artist, for slug → id lookups and joins (rows carry only artist ids).
 * Loads once per process; concurrent first requests share that one fetch.
 */
const directory = defineResource({
  name: 'artist-directory',
  ttl: 5 * MINUTES,
  load: () => unwrap(getApiV4Artists({ include_autocreated: true })),
  slim: (artists) => index(artists.map(toArtist)),
});

export const getArtistDirectory = () => directory.get();

/** The artist for a URL slug, or undefined. */
export async function findArtistBySlug(slug: string | undefined): Promise<Artist | undefined> {
  if (!slug) return undefined;
  return (await getArtistDirectory()).bySlug.get(slug);
}

/** The v4 artist id for a URL slug; 404s for an unknown artist. */
export async function artistIdForSlug(slug: string | undefined): Promise<string> {
  const artist = await findArtistBySlug(slug);
  if (!artist) deny(404);
  return artist.id;
}

export const years = defineResource({
  name: 'years',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdYears(artistId)),
  slim: (list): Year[] => list.map(toYear),
});

export const tours = defineResource({
  name: 'tours',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdTours(artistId)),
  slim: (list): Tour[] => list.map(toTour),
});

/** Songs: v4 mixes matched songs with songs only known from imported setlists. */
export const songs = defineResource({
  name: 'songs',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdSongs(artistId)),
  slim: (entries): Song[] =>
    entries.flatMap((e): Song[] => {
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
    }),
});

/**
 * Venues an artist played. Canonical venues link by slug; venues known only
 * from imported setlists link by id (their slugs can collide with canonical ones).
 */
export const venues = defineResource({
  name: 'venues',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdVenues(artistId)),
  slim: (entries): Venue[] =>
    entries.flatMap((e): Venue[] => {
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
    }),
});
