import type { GuideBlock } from '@/lib/guideMarkdown/types';
import type { PlaylistRow } from './spec';

// A playlist read as an article: prose in the flow, tracks as embedded cards.
// A segment with a description is a section: its entries and the author's
// comment on them, together. Tracks with no prose between them share one list;
// an unavailable track keeps its place in it.

export type PlaylistTrackGroupRow = Exclude<PlaylistRow, { kind: 'text' }>;

export type PlaylistItem =
  /** A text-only entry. */
  | { kind: 'text'; key: string; prose: GuideBlock[] }
  | { kind: 'tracks'; key: string; rows: PlaylistTrackGroupRow[] };

export type PlaylistBlock =
  | PlaylistItem
  /** A described segment: its entries, then its description beneath them. */
  | { kind: 'section'; key: string; items: PlaylistItem[]; comment: GuideBlock[] };

/** Appends rows as items, joining a track to the run of tracks before it. */
function addItems(into: PlaylistItem[] | PlaylistBlock[], rows: readonly PlaylistRow[]) {
  for (const row of rows) {
    if (row.kind === 'text') {
      if (row.prose?.length) into.push({ kind: 'text', key: row.id, prose: row.prose });
      continue;
    }
    const last = into.at(-1);
    if (last?.kind === 'tracks') last.rows.push(row);
    else into.push({ kind: 'tracks', key: row.id, rows: [row] });
  }
}

export function playlistBlocks(rows: readonly PlaylistRow[]): PlaylistBlock[] {
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
        items,
        comment: heading.prose,
      });
    } else {
      addItems(blocks, run);
    }
    i = end;
  }
  return blocks;
}
