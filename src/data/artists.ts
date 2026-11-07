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
import type { Artist, SongListItem, TourSummary, VenueListItem, YearSummary } from '@/domain/types';
import { toArtist, toTourSummary, toYearSummary, venueLocation } from './adapters';
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
    bySlug.set(artist.slug, artist);
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
  slim: (artists) => index(artists.flatMap((a) => toArtist(a) ?? [])),
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
  slim: (list): YearSummary[] => list.flatMap((y) => toYearSummary(y) ?? []),
});

export const tours = defineResource({
  name: 'tours',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdTours(artistId)),
  slim: (list): TourSummary[] => list.flatMap((t) => toTourSummary(t) ?? []),
});

/** Songs: v4 mixes matched songs with songs only known from imported setlists. Slugless songs can't be linked, so they're dropped. */
export const songs = defineResource({
  name: 'songs',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdSongs(artistId)),
  slim: (entries): SongListItem[] =>
    entries.flatMap((e): SongListItem[] => {
      if (e.song) {
        if (!e.song.slug) return [];
        return [
          {
            id: e.song.id,
            slug: e.song.slug,
            name: e.song.name ?? undefined,
            showCount: e.song.matched_show_count,
          },
        ];
      }
      if (e.imported_song) {
        if (!e.imported_song.slug) return [];
        return [
          {
            id: e.imported_song.id,
            slug: e.imported_song.slug,
            name: e.imported_song.name ?? undefined,
            showCount: e.imported_song.setlist_show_count,
            canonicalId: e.imported_song.normalized_song_id ?? undefined,
          },
        ];
      }
      return [];
    }),
});

/**
 * Venues an artist played. Canonical venues link by slug; venues known only
 * from imported setlists link by id (their slugs can collide with canonical ones).
 * Slugless canonical venues can't be linked, so they're dropped.
 */
export const venues = defineResource({
  name: 'venues',
  ttl: 5 * MINUTES,
  load: (artistId: string) => unwrap(getApiV4ArtistsArtistIdVenues(artistId)),
  slim: (entries): VenueListItem[] =>
    entries.flatMap((e): VenueListItem[] => {
      const av = e.artist_venue;
      if (av) {
        if (!av.venue.slug) return [];
        return [
          {
            id: av.id,
            slug: av.venue.slug,
            name: av.venue.name ?? undefined,
            location: venueLocation(av.venue),
            showCount: av.artist_show_count,
          },
        ];
      }
      const iv = e.imported_venue;
      if (iv) {
        return [
          {
            id: iv.id,
            slug: iv.id,
            name: iv.name ?? undefined,
            location: iv.location ?? undefined,
            showCount: iv.show_count,
          },
        ];
      }
      return [];
    }),
});
