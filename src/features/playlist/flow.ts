import type { GuideBlock } from '@/lib/guideMarkdown/types';
import {
  blockEdges,
  type BlockEdge,
  type PlaylistBlock,
  type PlaylistTrackGroupRow,
} from './blocks';

// The playlist's flow as one column of rows (PlaylistArticle renders them). Every
// row has the same two cells, the rail and the content, and rows sit flush: the
// spacing between blocks is rows too. So the rail is one line drawn piecewise,
// each row drawing its own height, and nothing about a row's kind or size can
// break it. Pure, so tested (flow.test.ts).

/** Space between blocks, and between loose cards. */
export const BLOCK_SPACE = 16;
export const CARD_SPACE = 6;

/** Where a row sits in a section's tinted box (null: not in one). */
export type BoxPosition = 'first' | 'middle' | 'last' | 'only';

/** The rail beside a row: the line above and below its middle, and a dot for a track. */
export type RailCell = { above: boolean; below: boolean; dot: boolean };

export type GapAt = { index: number; above?: BlockEdge; below?: BlockEdge };

/** Whose prose a block is: the editor edits it by this. */
export type ProseOwner =
  | { kind: 'playlist' }
  /** A described segment's comment. */
  | { kind: 'segment'; id: string }
  /** A text block: an entry's id, or a prose-only segment's. */
  | { kind: 'text'; id: string }
  /** A track's note, by entry id. */
  | { kind: 'note'; id: string };

type RowBase = { key: string; rail: RailCell };

export type FlowRow =
  | (RowBase & {
      kind: 'track';
      row: PlaylistTrackGroupRow;
      /** In a section's box, or a loose card of its own. */
      box: BoxPosition | null;
    })
  | (RowBase & {
      kind: 'prose';
      owner: ProseOwner;
      prose: GuideBlock[];
      /** Its place in the flow, for dragging (text blocks, not section comments). */
      dragRow?: { id: string; segmentId: string };
      box: BoxPosition | null;
    })
  | (RowBase & { kind: 'space'; height: number })
  /** The editor's place to add text or tracks, between blocks. */
  | (RowBase & { kind: 'gap'; at: GapAt });

/** A section's rows, wrapped together (its segment drags as one). */
export type FlowGroup = { key: string; sectionId?: string; rows: FlowRow[] };

type Draft = FlowRow extends infer R ? (R extends FlowRow ? Omit<R, 'rail'> : never) : never;

function boxOf(i: number, n: number): BoxPosition {
  if (n === 1) return 'only';
  return i === 0 ? 'first' : i === n - 1 ? 'last' : 'middle';
}

/**
 * The flow's rows, grouped by section. With `gaps`, the editor's gap rows go
 * between blocks (and before the first, and past the last) in place of spacing.
 */
export function flowRows(blocks: readonly PlaylistBlock[], { gaps = false } = {}): FlowGroup[] {
  const groups: { key: string; sectionId?: string; rows: Draft[] }[] = [];
  const space = (key: string, height: number): Draft => ({ kind: 'space', key, height });
  const gap = (index: number): Draft => ({
    kind: 'gap',
    key: `gap:${index}`,
    at: {
      index,
      above: index > 0 ? blockEdges(blocks[index - 1])?.last : undefined,
      below: index < blocks.length ? blockEdges(blocks[index])?.first : undefined,
    },
  });

  blocks.forEach((block, b) => {
    const between: Draft[] = gaps
      ? [gap(b)]
      : b > 0
        ? [space(`space:${block.key}`, BLOCK_SPACE)]
        : [];
    if (between.length) groups.push({ key: `between:${block.key}`, rows: between });

    if (block.kind === 'section') {
      // Everything in a section sits flush in one tinted box: its items, then its comment.
      const inner: Draft[] = [];
      for (const item of block.items) {
        if (item.kind === 'text')
          inner.push({
            kind: 'prose',
            key: item.key,
            owner: { kind: 'text', id: item.key },
            prose: item.prose,
            dragRow: { id: item.key, segmentId: item.segmentId },
            box: null,
          });
        else
          for (const row of item.rows) inner.push({ kind: 'track', key: row.id, row, box: null });
      }
      inner.push({
        kind: 'prose',
        key: `${block.key}:comment`,
        owner: { kind: 'segment', id: block.segmentId },
        prose: block.comment,
        box: null,
      });
      const boxed = inner.map((r, i) =>
        r.kind === 'track' || r.kind === 'prose' ? { ...r, box: boxOf(i, inner.length) } : r
      );
      groups.push({ key: block.key, sectionId: block.segmentId, rows: boxed });
      return;
    }

    if (block.kind === 'text') {
      groups.push({
        key: block.key,
        rows: [
          {
            kind: 'prose',
            key: block.key,
            owner: { kind: 'text', id: block.key },
            prose: block.prose,
            dragRow: { id: block.key, segmentId: block.segmentId },
            box: null,
          },
        ],
      });
      return;
    }

    // Loose cards: each its own, a little apart.
    const rows: Draft[] = [];
    block.rows.forEach((row, i) => {
      if (i > 0) rows.push(space(`space:${row.id}`, CARD_SPACE));
      rows.push({ kind: 'track', key: row.id, row, box: null });
    });
    groups.push({ key: block.key, rows });
  });
  if (gaps) groups.push({ key: 'between:end', rows: [gap(blocks.length)] });

  // The rail runs from the first track's dot to the last's.
  const all = groups.flatMap((g) => g.rows);
  const first = all.findIndex((r) => r.kind === 'track');
  const last = all.findLastIndex((r) => r.kind === 'track');
  let i = 0;
  return groups.map((g) => ({
    ...g,
    rows: g.rows.map((r) => {
      const at = i++;
      const inRange = first >= 0 && at >= first && at <= last;
      return {
        ...r,
        rail: {
          above: inRange && at > first,
          below: inRange && at < last,
          dot: r.kind === 'track',
        },
      } as FlowRow;
    }),
  }));
}
