import 'server-only';

import { deny } from '@timber-js/app/server';
import { unwrap } from '@/api/fetcher';
import {
  getApiV4ArtistsArtistIdSongsBySlugSlug,
  getApiV4ImportedSongsImportedSongId,
} from '@/api/generated/client';
import type { SongWithShowsResource } from '@/api/generated/model';
import type { PlayableTrack, SongDetail, SongPerformance } from '@/domain/types';
import { artistIdForSlug, songs } from './artists';
import { defineResource, denyIfMissing, isMissing, MINUTES, pathParam } from './resource';
import { toShowSummaries, toShowSummary } from './summaries';

/**
 * The by-slug response → SongDetail: a performance per file on the top tape
 * (see songBySlug). Exported for tests.
 */
export const slimSongBySlug = (
  song: SongWithShowsResource,
  _artistId: string,
  songSlug: string
): SongDetail => ({
  id: song.id,
  slug: song.slug ?? songSlug,
  name: song.name ?? 'Unknown song',
  originalArtist: song.original_artist ?? undefined,
  aliases: song.aliases ?? [],
  imported: false,
  // A performance per file on the top tape: a song can be played several
  // times in one show (Tweezer Reprise six times at SPAC 2025-07-27).
  performances: (song.shows ?? []).flatMap((entry): SongPerformance[] => {
    const show = toShowSummary(entry.show);
    if (!show) return [];
    const { single_song, multi_song } = entry.timings;
    // No single-song file on any tape: every file also holds other songs (a
    // segue), so lengths overstate the song.
    const durationApprox = !single_song && !!multi_song;
    const files = entry.tracks ?? [];
    const track = (file: (typeof files)[number]): PlayableTrack => ({
      id: file.id,
      title: file.title ?? song.name ?? '',
      slug: file.slug ?? '',
      duration: file.duration ?? undefined,
      mp3Url: file.mp3_url ?? null,
      sourceId: file.source_id,
    });
    // Played once: the median across every tape is steadier than one file.
    if (files.length <= 1) {
      return [
        {
          show,
          track: files[0] ? track(files[0]) : undefined,
          duration: single_song?.median ?? multi_song?.median ?? null,
          durationApprox,
        },
      ];
    }
    return files.map((file, i) => ({
      show,
      track: track(file),
      duration: file.duration,
      durationApprox,
      repeat: { index: i + 1, of: files.length },
    }));
  }),
});

/**
 * A song by slug, with each show's matching files from its best tape
 * (`include_tracks=top`, ranked like sortSources). Merged slugs return the
 * surviving song; the page redirects when the returned slug differs.
 */
const songBySlug = defineResource({
  name: 'song-by-slug',
  ttl: 5 * MINUTES,
  load: (artistId: string, songSlug: string) =>
    unwrap(
      getApiV4ArtistsArtistIdSongsBySlugSlug(artistId, pathParam(songSlug), {
        include_tracks: 'top',
      })
    ),
  slim: slimSongBySlug,
});

/** A song known only from imported setlists: shows, no recordings. */
const importedSong = defineResource({
  name: 'imported-song',
  ttl: 5 * MINUTES,
  load: (songId: string) => unwrap(getApiV4ImportedSongsImportedSongId(songId)),
  slim: (song): SongDetail => ({
    id: song.id,
    slug: song.slug ?? '',
    name: song.name ?? 'Unknown song',
    aliases: [],
    imported: true,
    performances: toShowSummaries(song.shows).map((show) => ({
      show,
      duration: null,
      durationApprox: false,
    })),
  }),
});

/** A song id (`song_…`): track menus link by id, since the API's track songs carry no slug. */
const SONG_ID = /^song_[0-9a-hjkmnp-tv-z]{8}$/;

/**
 * A song's page data: one request for canonical songs. A song id (from a track
 * menu) loads the song under its slug, so the page redirects there. Slugs the API doesn't
 * know as canonical songs (imported, setlist-only songs) fall back to the song
 * list: an imported song linked to a canonical one returns that song (its slug
 * differs, so the page redirects); otherwise the imported song. 404s otherwise.
 */
export async function songDetail(artistSlug: string, songSlug: string): Promise<SongDetail> {
  const artistId = await artistIdForSlug(artistSlug);
  if (SONG_ID.test(songSlug)) {
    // The artist's song list is cached and small next to the song endpoints,
    // which return every show even without tracks.
    const slug = (await songs.orDeny(artistId)).find((s) => s.id === songSlug)?.slug;
    if (!slug) deny(404);
    return songBySlug.orDeny(artistId, slug);
  }
  try {
    return await songBySlug.get(artistId, songSlug);
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
  const list = await songs.orDeny(artistId);
  const song = list.find((s) => s.slug === songSlug);
  if (!song?.id.startsWith('imported_song_')) deny(404);
  const canonicalSlug = song.canonicalId
    ? list.find((s) => s.id === song.canonicalId)?.slug
    : undefined;
  if (canonicalSlug) return songBySlug.orDeny(artistId, canonicalSlug);
  return denyIfMissing(importedSong.get(song.id));
}
