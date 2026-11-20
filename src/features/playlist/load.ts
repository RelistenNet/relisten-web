import 'server-only';

import { href } from '@timber-js/app/routes';
import { getArtistDirectory } from '@/data/artists';
import { getPlaylistCatalog, type PlaylistCatalog } from '@/data/playlists';
import type { PlaylistContent } from '@/domain/playlists';
import { sanitizeGuide } from '@/lib/guideMarkdown/sanitize';
import type { GuideBlock, GuideContext } from '@/lib/guideMarkdown/types';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { showRow, type ArtistsById } from '@/ui/shows/rows';
import type { PlaylistRow } from './spec';

export type PlaylistView = {
  name: string;
  /** The playlist's description, sanitized. */
  description?: GuideBlock[];
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
  // A timestamp link can only play an entry the catalog has.
  const playable = new Set(
    playlist.segments.flatMap((s) =>
      s.entries.filter((e) => e.trackId && catalog.tracks[e.trackId]).map((e) => e.id)
    )
  );
  const canSeek = (entryId: string) => playable.has(entryId);
  const prose = (text: string | undefined, context: GuideContext) =>
    text ? sanitizeGuide(text, context) : undefined;
  for (const segment of playlist.segments) {
    const heading = segment.description
      ? {
          id: segment.id,
          description: segment.description,
          prose: sanitizeGuide(segment.description, { kind: 'segment', canSeek }),
        }
      : null;
    // A segment of prose alone (no entries) reads as a text block between groups.
    if (heading && segment.entries.length === 0) {
      rows.push({
        id: segment.id,
        position: rows.length + 1,
        description: heading.description,
        prose: heading.prose,
        segment: null,
        kind: 'text',
      });
      continue;
    }
    for (const entry of segment.entries) {
      const fields = {
        id: entry.id,
        position: rows.length + 1,
        description: entry.description,
        segment: heading,
      };
      if (!entry.trackId) {
        rows.push({
          ...fields,
          kind: 'text',
          prose: prose(entry.description, { kind: 'text', canSeek }),
        });
        continue;
      }
      const track = catalog.tracks[entry.trackId];
      const show = track && catalog.shows[track.showId];
      const row = show && showRow(show, artists);
      if (!track || !row) {
        // Its own timestamps can't play, so they stay text.
        rows.push({
          ...fields,
          kind: 'unavailable',
          prose: prose(entry.description, { kind: 'track', entryId: entry.id, canSeek }),
        });
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
        prose: prose(entry.description, {
          kind: 'track',
          entryId: entry.id,
          durationSeconds: track.duration ?? undefined,
          canSeek,
        }),
        track,
        trackTitle: track.title,
        songDuration: track.duration ?? null,
      });
    }
  }
  return {
    name: playlist.name,
    description: prose(playlist.description, { kind: 'playlist', canSeek }),
    rows,
    trackCount: rows.filter((r) => r.kind === 'track').length,
    duration,
  };
}
