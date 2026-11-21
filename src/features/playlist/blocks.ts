import type { GuideBlock } from '@/lib/guideMarkdown/types';
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
    }
  /**
   * The editor only: an undescribed segment of two or more entries, shown as a
   * group so it's clear what belongs together (readers see loose tracks).
   */
  | { kind: 'group'; key: string; segmentId: string; items: PlaylistItem[] };

/**
 * Appends rows as items. A track joins the run of tracks before it, unless
 * `apart` (the editor's loose tracks, each in a segment of its own).
 */
function addItems(
  into: PlaylistItem[] | PlaylistBlock[],
  rows: readonly PlaylistRow[],
  apart = false
) {
  for (const row of rows) {
    if (row.kind === 'text') {
      if (row.prose?.length)
        into.push({ kind: 'text', key: row.id, segmentId: row.segmentId, prose: row.prose });
      continue;
    }
    const last = into.at(-1);
    if (last?.kind === 'tracks' && !apart) last.rows.push(row);
    else into.push({ kind: 'tracks', key: row.id, rows: [row] });
  }
}

/**
 * The flow's blocks. With `segments` (the editor), undescribed segments stay
 * apart: one of two or more entries is a group; a lone track is its own block.
 */
export function playlistBlocks(
  rows: readonly PlaylistRow[],
  { segments = false }: { segments?: boolean } = {}
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
      addItems(items, run);
      blocks.push({
        kind: 'section',
        key: `section:${heading.id}`,
        segmentId: heading.id,
        items,
        comment: heading.prose,
      });
    } else if (!segments) {
      addItems(blocks, run);
    } else {
      // Undescribed segments ran together above: split them back apart.
      for (let j = 0; j < run.length;) {
        let k = j;
        while (k < run.length && run[k].segmentId === run[j].segmentId) k++;
        const segment = run.slice(j, k);
        if (segment.length > 1) {
          const items: PlaylistItem[] = [];
          addItems(items, segment);
          blocks.push({
            kind: 'group',
            key: `group:${run[j].segmentId}`,
            segmentId: run[j].segmentId,
            items,
          });
        } else addItems(blocks, segment, true);
        j = k;
      }
    }
    i = end;
  }
  return blocks;
}

/** Where a block starts and ends: the first and last row (entry or prose-only segment) in it. */
export type BlockEdge = { id: string; segmentId: string };

export function blockEdges(block: PlaylistBlock): { first: BlockEdge; last: BlockEdge } | null {
  const items = block.kind === 'section' || block.kind === 'group' ? block.items : [block];
  const edges = items.flatMap((item): BlockEdge[] =>
    item.kind === 'text'
      ? [{ id: item.key, segmentId: item.segmentId }]
      : item.rows.map((r) => ({ id: r.id, segmentId: r.segmentId }))
  );
  // A section with only its comment: the segment itself.
  if (!edges.length && block.kind === 'section')
    return {
      first: { id: block.segmentId, segmentId: block.segmentId },
      last: { id: block.segmentId, segmentId: block.segmentId },
    };
  return edges.length ? { first: edges[0], last: edges[edges.length - 1] } : null;
}
