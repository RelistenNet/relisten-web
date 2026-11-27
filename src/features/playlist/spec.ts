import type { GuideBlock } from '@/lib/guideMarkdown/types';
import type { ShowRow } from '@/ui/shows/rows';

// A playlist's entries in authored order, as rows the page lays out (blocks.ts).

/** A segment with a description gets a heading row above its entries; others run on unheaded. */
export type PlaylistSegmentHeading = {
  id: string;
  /** As written: the editor edits this. */
  description: string;
  /** Sanitized, to render. */
  prose: GuideBlock[];
};

type EntryFields = {
  /** The entry id: unique per row. */
  id: string;
  /** 1-based, across the whole playlist. */
  position: number;
  /** The segment it's in (for a prose-only segment's text block, its own id). */
  segmentId: string;
  /** As written: the editor edits this. */
  description?: string;
  /** The description sanitized, to render. */
  prose?: GuideBlock[];
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
export type PlaylistOtherRow = EntryFields & {
  kind: 'text' | 'unavailable';
  /**
   * An unavailable row whose track the server hasn't looked up yet (just added,
   * or added in another tab): its details are on the way (`unresolved` in rows.ts).
   */
  pending?: boolean;
};

export type PlaylistRow = PlaylistTrackRow | PlaylistOtherRow;

export const isTrackRow = (r: PlaylistRow): r is PlaylistTrackRow => r.kind === 'track';
