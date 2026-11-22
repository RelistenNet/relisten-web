import type { GuideBlock } from '@/lib/guideMarkdown/types';
import { plainBlocks } from '@/lib/guideMarkdown/plain';
import type { PlaylistRow } from './spec';

// A playlist read as an article: prose in the flow, tracks as embedded cards.
// A segment with a description is a section: its entries and the author's
// comment on them, together. Tracks with no prose between them share one list;
// an unavailable track keeps its place in it.

export type PlaylistTrackGroupRow = Exclude<PlaylistRow, { kind: 'text' }>;

export type PlaylistItem =
  /** A text-only entry. */
  | { kind: 'text'; key: string; segmentId: string; prose: GuideBlock[] }
  | { kind: 'tracks'; key: string; rows: PlaylistTrackGroupRow[] };

export type PlaylistBlock =
  | PlaylistItem
  /** A described segment: its entries, then its description beneath them. */
  | {
      kind: 'section';
      key: string;
      segmentId: string;
      items: PlaylistItem[];
      comment: GuideBlock[];
    };

/** Appends rows as items. A track joins the run of tracks before it. */
function addItems(
  into: PlaylistItem[] | PlaylistBlock[],
  rows: readonly PlaylistRow[],
  {
    keepEmpty = false,
  }: {
    /** Keep text that sanitizes to nothing, shown as written (the editor). */
    keepEmpty?: boolean;
  } = {}
) {
  for (const row of rows) {
    if (row.kind === 'text') {
      // Text that sanitizes to nothing (an image alone) is skipped for readers; the
      // editor shows it as written, so it can still be fixed or removed.
      const prose = row.prose?.length
        ? row.prose
        : keepEmpty
          ? plainBlocks(row.description ?? '')
          : [];
      if (prose.length) into.push({ kind: 'text', key: row.id, segmentId: row.segmentId, prose });
      continue;
    }
    const last = into.at(-1);
    if (last?.kind === 'tracks') last.rows.push(row);
    else into.push({ kind: 'tracks', key: row.id, rows: [row] });
  }
}

/**
 * The flow's blocks: the same for readers and the editor, so opening the editor
 * moves nothing (it outlines its groups over these rows: flow.ts). With
 * `keepEmpty` (the editor), text that sanitizes to nothing still shows, as
 * written, so it can be fixed.
 */
export function playlistBlocks(
  rows: readonly PlaylistRow[],
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): PlaylistBlock[] {
  const blocks: PlaylistBlock[] = [];
  let i = 0;
  while (i < rows.length) {
    // A run of rows from one segment (undescribed segments run together: they're loose).
    const heading = rows[i].segment;
    let end = i;
    while (end < rows.length && rows[end].segment?.id === heading?.id) end++;
    const run = rows.slice(i, end);
    if (heading) {
      const items: PlaylistItem[] = [];
      addItems(items, run, { keepEmpty });
      blocks.push({
        kind: 'section',
        key: `section:${heading.id}`,
        segmentId: heading.id,
        items,
        comment: heading.prose,
      });
    } else addItems(blocks, run, { keepEmpty });
    i = end;
  }
  return blocks;
}

/** An entry's (or a prose-only segment's) place: the row a drop or new text goes next to. */
export type BlockEdge = { id: string; segmentId: string };
