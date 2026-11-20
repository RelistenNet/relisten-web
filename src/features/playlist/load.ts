import 'server-only';

import { href } from '@timber-js/app/routes';
import { getArtistDirectory } from '@/data/artists';
import { getPlaylistCatalog, type PlaylistCatalog, type PlaylistContent } from '@/data/playlists';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { showRow, type ArtistsById } from '@/ui/shows/rows';
import type { PlaylistRow } from './spec';

export type PlaylistView = {
  name: string;
  description?: string;
  rows: PlaylistRow[];
  /** Playable tracks. */
  trackCount: number;
  /** Seconds, over the tracks the catalog has. */
  duration: number;
};

/** A playlist's entries as table rows, with each track looked up in the catalog. */
export async function loadPlaylistView(playlist: PlaylistContent): Promise<PlaylistView> {
  const [catalog, directory] = await Promise.all([
    getPlaylistCatalog(playlist),
    getArtistDirectory(),
  ]);
  return playlistView(playlist, catalog, directory.byId);
}

export function playlistView(
  playlist: PlaylistContent,
  catalog: PlaylistCatalog,
  artists: ArtistsById
): PlaylistView {
  const rows: PlaylistRow[] = [];
  let duration = 0;
  for (const segment of playlist.segments) {
    const heading = segment.description
      ? { id: segment.id, description: segment.description }
      : null;
    for (const entry of segment.entries) {
      const fields = {
        id: entry.id,
        position: rows.length + 1,
        description: entry.description,
        segment: heading,
      };
      if (!entry.trackId) {
        rows.push({ ...fields, kind: 'text' });
        continue;
      }
      const track = catalog.tracks[entry.trackId];
      const show = track && catalog.shows[track.showId];
      const row = show && showRow(show, artists);
      if (!track || !row) {
        rows.push({ ...fields, kind: 'unavailable' });
        continue;
      }
      duration += track.duration ?? 0;
      rows.push({
        ...row,
        ...fields,
        kind: 'track',
        queueKey: entry.id,
        // The show page, on this track's tape.
        href: href(
          '/artists/[artistSlug]/shows/[showDate]',
          { artistSlug: row.artistSlug, showDate: row.date },
          sourceQuery(track.sourceId)
        ),
        track,
        trackTitle: track.title,
        songDuration: track.duration ?? null,
      });
    }
  }
  return {
    name: playlist.name,
    description: playlist.description,
    rows,
    trackCount: rows.filter((r) => r.kind === 'track').length,
    duration,
  };
}
