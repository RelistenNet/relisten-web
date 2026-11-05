import type { Source, Track } from '@/types';

// v4 matches each track to the songs it contains (track.song_ids), so a song's
// track can be found in any tape of a show without relying on track slugs, which
// vary from tape to tape ("09-scarlet-begonias", "scarlet-begonias-2").
// Shared by server and client code.

/** Songs known only from imported setlists: v4 never matches tracks to these. */
export const isImportedSongId = (songId: string | undefined) =>
  !!songId && songId.startsWith('imported_song_');

export const trackMatchesSong = (track: Track, songId: string | undefined) =>
  !!songId && !!track.song_ids?.includes(songId);

/** The source's first track matched to the song, if any. */
export const matchedTrack = (source: Source | undefined, songId: string | undefined) =>
  songId
    ? source?.sets?.flatMap((set) => set.tracks ?? []).find((t) => trackMatchesSong(t, songId))
    : undefined;

/**
 * The source to show: the one `?source=` asks for, else (when a song is in
 * focus) the first source in sort order that has the song, else the first.
 * `sources` must already be sorted.
 */
export const pickSource = (
  sources: Source[],
  wantedSourceId: string | undefined,
  songId: string | undefined
) =>
  sources.find((s) => s.id === wantedSourceId) ??
  (songId ? sources.find((s) => matchedTrack(s, songId)) : undefined) ??
  sources[0];
