import type { PlaylistContent } from '@/domain/playlists';
import { plainBlocks } from '@/lib/guideMarkdown/plain';
import type { GuideBlock } from '@/lib/guideMarkdown/types';
import type { PlaylistRow, PlaylistTrackRow } from './spec';

// A playlist's rows from its content and what the server resolved for it. Pure
// and safe anywhere: the read pages build them on the server, and the editor
// builds them on the client from its draft, so an edit lays out at once.

/** A track's row, without the entry it's in (a playlist can hold a track twice). */
export type ResolvedTrack = Omit<
  PlaylistTrackRow,
  'id' | 'position' | 'segmentId' | 'description' | 'prose' | 'segment' | 'kind' | 'queueKey'
>;

/** What the server looked up: catalog tracks by track id, and sanitized prose by owner id. */
export type PlaylistResolved = {
  tracks: Record<string, ResolvedTrack>;
  /** Track ids the catalog doesn't have. Any other unknown id was just added: pending. */
  missing: string[];
  /** Keyed by entry or segment id, or PLAYLIST_PROSE; `source` is the text it was made from. */
  prose: Record<string, { source: string; blocks: GuideBlock[] }>;
};

/** The prose key for the playlist's own description. */
export const PLAYLIST_PROSE = 'playlist';

export type PlaylistView = {
  name: string;
  /** The playlist's description, sanitized. */
  description?: GuideBlock[];
  rows: PlaylistRow[];
  /** Playable tracks. */
  trackCount: number;
  /** Seconds, over the tracks the catalog has. */
  duration: number;
  /**
   * Prose shown as plain text because it changed since the server rendered it
   * (by owner id, or PLAYLIST_PROSE): the editor marks it pending until it has.
   */
  pendingProse: string[];
};

/**
 * Prose for `text`: the server's sanitized copy while it still matches, else
 * the text as written (an edit the server hasn't rendered yet).
 */
function proseFor(
  resolved: PlaylistResolved,
  id: string,
  text: string | undefined,
  pending: string[]
) {
  if (!text) return undefined;
  const known = resolved.prose[id];
  if (known?.source === text) return known.blocks;
  pending.push(id);
  return plainBlocks(text);
}

export function playlistView(content: PlaylistContent, resolved: PlaylistResolved): PlaylistView {
  const rows: PlaylistRow[] = [];
  const pendingProse: string[] = [];
  let duration = 0;
  for (const segment of content.segments) {
    const heading = segment.description
      ? {
          id: segment.id,
          description: segment.description,
          prose: proseFor(resolved, segment.id, segment.description, pendingProse) ?? [],
        }
      : null;
    // A segment of prose alone (no entries) reads as a text block between groups.
    if (heading && segment.entries.length === 0) {
      rows.push({
        id: segment.id,
        position: rows.length + 1,
        segmentId: segment.id,
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
        segmentId: segment.id,
        description: entry.description,
        prose: proseFor(resolved, entry.id, entry.description, pendingProse),
        segment: heading,
      };
      const track = entry.trackId ? resolved.tracks[entry.trackId] : undefined;
      if (!entry.trackId) rows.push({ ...fields, kind: 'text' });
      else if (!track)
        rows.push({
          ...fields,
          kind: 'unavailable',
          // Added since the server looked (the editor): its details are on the way.
          ...(!resolved.missing.includes(entry.trackId) && { pending: true }),
        });
      else {
        duration += track.songDuration ?? 0;
        rows.push({ ...track, ...fields, kind: 'track', queueKey: entry.id });
      }
    }
  }
  return {
    name: content.name,
    description: proseFor(resolved, PLAYLIST_PROSE, content.description, pendingProse),
    rows,
    trackCount: rows.filter((r) => r.kind === 'track').length,
    duration,
    pendingProse,
  };
}
