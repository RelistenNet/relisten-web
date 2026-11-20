import type { ShowRow } from '@/ui/shows/rows';

// A playlist's entries in authored order, as rows the page lays out (blocks.ts).

/** A segment with a description gets a heading row above its entries; others run on unheaded. */
export type PlaylistSegmentHeading = { id: string; description: string };

type EntryFields = {
  /** The entry id: unique per row. */
  id: string;
  /** 1-based, across the whole playlist. */
  position: number;
  description?: string;
  segment: PlaylistSegmentHeading | null;
};

/** A track entry, as a show row, so the show and song tables' play and queue cells work. */
export type PlaylistTrackRow = ShowRow &
  EntryFields & {
    kind: 'track';
    /** The entry id again: a playlist can repeat a track, so entries are queued by entry. */
    queueKey: string;
    track: NonNullable<ShowRow['track']>;
  };

/** A text block, or a track the catalog doesn't have (anymore). Shown, never dropped. */
export type PlaylistOtherRow = EntryFields & { kind: 'text' | 'unavailable' };

export type PlaylistRow = PlaylistTrackRow | PlaylistOtherRow;

export const isTrackRow = (r: PlaylistRow): r is PlaylistTrackRow => r.kind === 'track';
