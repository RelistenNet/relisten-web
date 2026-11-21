import 'server-only';

import { href } from '@timber-js/app/routes';
import { getArtistDirectory } from '@/data/artists';
import { getPlaylistCatalog, type PlaylistCatalog } from '@/data/playlists';
import type { PlaylistContent } from '@/domain/playlists';
import { sanitizeGuide } from '@/lib/guideMarkdown/sanitize';
import type { GuideContext } from '@/lib/guideMarkdown/types';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { songRowItem } from '@/player/queue/items';
import { showRow, type ArtistsById } from '@/ui/shows/rows';
import { PLAYLIST_PROSE, type PlaylistResolved, type PlaylistView, playlistView } from './rows';

export type { PlaylistView } from './rows';

/** A playlist's view, and what it was built from (the editor rebuilds it from its draft). */
export async function loadPlaylistView(
  playlist: PlaylistContent
): Promise<{ view: PlaylistView; resolved: PlaylistResolved }> {
  const resolved = await loadPlaylistResolved(playlist);
  return { view: playlistView(playlist, resolved), resolved };
}

/** What the editor lays out its draft from: the playlist's tracks and prose, resolved. */
export async function loadPlaylistResolved(playlist: PlaylistContent): Promise<PlaylistResolved> {
  const [catalog, directory] = await Promise.all([
    getPlaylistCatalog(playlist),
    getArtistDirectory(),
  ]);
  return resolvePlaylist(playlist, catalog, directory.byId);
}

/** Looks up each track in the catalog and sanitizes every description, for playlistView. */
export function resolvePlaylist(
  playlist: PlaylistContent,
  catalog: PlaylistCatalog,
  artists: ArtistsById
): PlaylistResolved {
  const tracks: PlaylistResolved['tracks'] = {};
  for (const [trackId, track] of Object.entries(catalog.tracks)) {
    const show = catalog.shows[track.showId];
    const row = show && showRow(show, artists);
    if (!row) continue;
    tracks[trackId] = {
      ...row,
      // The show page, on this track's tape.
      href: href(
        '/artists/[artistSlug]/shows/[showDate]',
        { artistSlug: row.artistSlug, showDate: row.date },
        sourceQuery(track.sourceId)
      ),
      track,
      trackTitle: track.title,
      songDuration: track.duration ?? null,
    };
  }

  // A timestamp link plays its entry only if the queue would: the same check as
  // the article's queue (songRowItem), so a track without audio stays text.
  const playable = new Set(
    playlist.segments.flatMap((s) =>
      s.entries
        .filter((e) => {
          const track = e.trackId ? tracks[e.trackId] : undefined;
          return !!track && songRowItem({ ...track, id: e.id }) !== null;
        })
        .map((e) => e.id)
    )
  );
  const canSeek = (entryId: string) => playable.has(entryId);
  const prose: PlaylistResolved['prose'] = {};
  const add = (id: string, source: string | undefined, context: GuideContext) => {
    if (source) prose[id] = { source, blocks: sanitizeGuide(source, context) };
  };
  add(PLAYLIST_PROSE, playlist.description, { kind: 'playlist', canSeek });
  for (const segment of playlist.segments) {
    add(segment.id, segment.description, { kind: 'segment', canSeek });
    for (const entry of segment.entries) {
      const track = entry.trackId ? tracks[entry.trackId] : undefined;
      add(
        entry.id,
        entry.description,
        entry.trackId
          ? {
              kind: 'track',
              entryId: entry.id,
              durationSeconds: track?.songDuration ?? undefined,
              canSeek,
            }
          : { kind: 'text', canSeek }
      );
    }
  }
  const missing = [
    ...new Set(
      playlist.segments.flatMap((s) =>
        s.entries.flatMap((e) => (e.trackId && !tracks[e.trackId] ? [e.trackId] : []))
      )
    ),
  ];
  return { tracks, prose, missing };
}
