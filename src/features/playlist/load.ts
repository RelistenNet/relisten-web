import 'server-only';

import { href } from '@timber-js/app/routes';
import { getArtistDirectory } from '@/data/artists';
import { getPlaylistCatalog, type PlaylistCatalog } from '@/data/playlists';
import type { PlaylistContent } from '@/domain/playlists';
import { sanitizeGuide } from '@/lib/guideMarkdown/sanitize';
import type { GuideContext } from '@/lib/guideMarkdown/types';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { showRow, type ArtistsById } from '@/ui/shows/rows';
import { PLAYLIST_PROSE, type PlaylistResolved, type PlaylistView, playlistView } from './rows';

export type { PlaylistView } from './rows';

/** A playlist's view, and what it was built from (the editor rebuilds it from its draft). */
export async function loadPlaylistView(
  playlist: PlaylistContent
): Promise<{ view: PlaylistView; resolved: PlaylistResolved }> {
  const [catalog, directory] = await Promise.all([
    getPlaylistCatalog(playlist),
    getArtistDirectory(),
  ]);
  const resolved = resolvePlaylist(playlist, catalog, directory.byId);
  return { view: playlistView(playlist, resolved), resolved };
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

  // A timestamp link can only play an entry whose track resolved.
  const playable = new Set(
    playlist.segments.flatMap((s) =>
      s.entries.filter((e) => e.trackId && tracks[e.trackId]).map((e) => e.id)
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
  return { tracks, prose };
}
