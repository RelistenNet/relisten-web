import type { GuideBlock } from '@/lib/guideMarkdown/types';
import type { BlockEdge, PlaylistBlock, PlaylistItem, PlaylistTrackGroupRow } from './blocks';
import type { DragSource, DropTarget } from './dragOps';

// The playlist's flow as one column of rows (PlaylistArticle renders them). Every
// row has the same two cells, the rail and the content, and rows sit flush: the
// spacing between blocks is rows too. So the rail is one line drawn piecewise,
// each row drawing its own height, and nothing about a row's kind or size can
// break it. In the editor, groups and the drop zones a drag needs are rows too.
// Pure, so tested (flow.test.ts).

/** Space between blocks, and between loose cards. */
export const BLOCK_SPACE = 16;
export const CARD_SPACE = 6;

/** A row's place in a box: a section's (tinted) or, in the editor, a group's (outlined). */
export type Box = { position: 'first' | 'middle' | 'last' | 'only'; tone: 'section' | 'group' };

/** The rail beside a row: the line above and below its middle, and a dot for a track. */
export type RailCell = { above: boolean; below: boolean; dot: boolean };

/** Where the editor's composer (or its Add zone) sits: the rows on either side. */
export type GapAt = { key: string; above?: BlockEdge; below?: BlockEdge };

/** Whose prose a block is: the editor edits it by this. */
export type ProseOwner =
  | { kind: 'playlist' }
  /** A described segment's comment. */
  | { kind: 'segment'; id: string }
  /** A text block: an entry's id, or a prose-only segment's. */
  | { kind: 'text'; id: string }
  /** A track's note, by entry id. */
  | { kind: 'note'; id: string };

type RowBase = { key: string; rail: RailCell; box: Box | null };

export type FlowRow =
  | (RowBase & { kind: 'track'; row: PlaylistTrackGroupRow })
  | (RowBase & {
      kind: 'prose';
      owner: ProseOwner;
      prose: GuideBlock[];
      /** Its place in the flow, for dragging (text blocks, not section comments). */
      dragRow?: { id: string; segmentId: string };
    })
  | (RowBase & { kind: 'space'; height: number })
  /** The editor's composer, or its Add zone at the end. */
  | (RowBase & { kind: 'gap'; at: GapAt })
  /** While dragging: a place to drop it. */
  | (RowBase & { kind: 'drop'; target: DropTarget });

/** A section's or group's rows, wrapped together (its segment drags as one). */
export type FlowGroup = { key: string; segmentId?: string; rows: FlowRow[] };

export type FlowOptions = {
  /** The editor: an Add zone at the end, and the composer after `insertAfter`. */
  editing?: boolean;
  /** A row key to open the composer after ('' for the very start). */
  insertAfter?: string | null;
  /** What's being dragged: drop zones go wherever it can land and would move. */
  dragging?: DragSource | null;
};

type Draft = FlowRow extends infer R
  ? R extends FlowRow
    ? Omit<R, 'rail' | 'box'>
    : never
  : never;
type Part = { key: string; segmentId?: string; tone?: Box['tone']; rows: Draft[] };

const edgeOf = (r: Draft): BlockEdge | undefined =>
  r.kind === 'track'
    ? { id: r.row.id, segmentId: r.row.segmentId }
    : r.kind === 'prose'
      ? (r.dragRow ??
        (r.owner.kind === 'segment' ? { id: r.owner.id, segmentId: r.owner.id } : undefined))
      : undefined;

/** Rows for a block's items: tracks and text, `apart` inserting space between loose cards. */
function itemRows(items: PlaylistItem[], apart: boolean): Draft[] {
  const rows: Draft[] = [];
  for (const item of items) {
    if (item.kind === 'text') {
      rows.push({
        kind: 'prose',
        key: item.key,
        owner: { kind: 'text', id: item.key },
        prose: item.prose,
        dragRow: { id: item.key, segmentId: item.segmentId },
      });
      continue;
    }
    item.rows.forEach((row, i) => {
      if (apart && i > 0) rows.push({ kind: 'space', key: `space:${row.id}`, height: CARD_SPACE });
      rows.push({ kind: 'track', key: row.id, row });
    });
  }
  return rows;
}

/** The entries a drop zone between `before` and `after` sits between (null: the group's edge). */
function innerZones(rows: Draft[], segmentId: string, dragging: DragSource): Draft[] {
  const entries = rows.filter((r) => r.kind === 'track' || (r.kind === 'prose' && r.dragRow));
  const out: Draft[] = [];
  const zone = (key: string, target: DropTarget): Draft => ({ kind: 'drop', key, target });
  const ids = entries.map((r) => edgeOf(r)?.id as string);
  // Before the first entry, then after each: skipping the two either side of the
  // dragged entry, where dropping would leave it where it is.
  const at = ids.indexOf(dragging.id);
  for (const row of rows) {
    const i = entries.indexOf(row);
    if (i === 0 && at !== 0)
      out.push(
        zone(`drop:before:${ids[0]}`, { kind: 'row', rowId: ids[0], segmentId, edge: 'top' })
      );
    out.push(row);
    if (i >= 0 && i !== at && i !== at - 1)
      out.push(
        zone(`drop:after:${ids[i]}`, { kind: 'row', rowId: ids[i], segmentId, edge: 'bottom' })
      );
  }
  return out;
}

/**
 * The flow's rows, grouped by section or group. In the editor, `dragging` adds
 * drop zones and `insertAfter` the composer.
 */
export function flowRows(
  blocks: readonly PlaylistBlock[],
  { editing = false, insertAfter = null, dragging = null }: FlowOptions = {}
): FlowGroup[] {
  const parts: Part[] = [];
  const space = (key: string): Part => ({
    key: `between:${key}`,
    rows: [{ kind: 'space', key: `space:${key}`, height: BLOCK_SPACE }],
  });
  /** The segments on either side of the space before block `b`. */
  const around = (b: number) => ({
    above: b > 0 ? lastSegment(blocks[b - 1]) : undefined,
    below: b < blocks.length ? firstSegment(blocks[b]) : undefined,
  });
  const holds = (block: PlaylistBlock | undefined) =>
    !!block && !!dragging && blockHolds(block, dragging);

  blocks.forEach((block, b) => {
    // Between blocks: a zone while dragging (unless dropping there changes nothing),
    // else plain space.
    const { above, below } = around(b);
    if (dragging && !holds(blocks[b - 1]) && !holds(block))
      parts.push({
        key: `between:${block.key}`,
        rows: [{ kind: 'drop', key: `drop:gap:${b}`, target: { kind: 'gap', above, below } }],
      });
    else if (b > 0) parts.push(space(block.key));

    if (block.kind === 'section' || block.kind === 'group') {
      let rows = itemRows(block.items, false);
      if (block.kind === 'section')
        rows.push({
          kind: 'prose',
          key: `${block.key}:comment`,
          owner: { kind: 'segment', id: block.segmentId },
          prose: block.comment,
        });
      // Inside a box only an entry moves (a whole segment goes between blocks).
      if (dragging?.kind === 'entry') rows = innerZones(rows, block.segmentId, dragging);
      parts.push({
        key: block.key,
        segmentId: block.segmentId,
        tone: block.kind === 'section' ? 'section' : 'group',
        rows,
      });
      return;
    }
    parts.push({ key: block.key, rows: itemRows([block], true) });
  });
  if (dragging && blocks.length && !holds(blocks.at(-1)))
    parts.push({
      key: 'between:end',
      rows: [
        {
          kind: 'drop',
          key: 'drop:gap:end',
          target: { kind: 'gap', above: lastSegment(blocks[blocks.length - 1]) },
        },
      ],
    });

  // The composer, after the row it was opened from; and the Add zone at the end.
  if (editing) {
    if (insertAfter !== null) {
      const gap: Draft = { kind: 'gap', key: `gap:${insertAfter}`, at: { key: insertAfter } };
      const part = insertAfter
        ? parts.find((p) => p.rows.some((r) => r.key === insertAfter))
        : undefined;
      if (part) part.rows.splice(part.rows.findIndex((r) => r.key === insertAfter) + 1, 0, gap);
      else parts.unshift({ key: 'between:start', rows: [gap] });
    }
    if (!dragging)
      parts.push({
        key: 'between:add',
        rows: [{ kind: 'gap', key: 'gap:end', at: { key: 'end' } }],
      });
  }

  // Each gap's neighbours, now that everything's in place.
  const flat = parts.flatMap((p) => p.rows);
  flat.forEach((r, i) => {
    if (r.kind !== 'gap') return;
    const prev = flat.slice(0, i).reverse().map(edgeOf).find(Boolean);
    const next = flat
      .slice(i + 1)
      .map(edgeOf)
      .find(Boolean);
    r.at = { ...r.at, above: prev, below: next };
  });

  // The rail runs from the first track's dot to the last's.
  const first = flat.findIndex((r) => r.kind === 'track');
  const last = flat.findLastIndex((r) => r.kind === 'track');
  let i = 0;
  return parts.map((part) => ({
    key: part.key,
    segmentId: part.segmentId,
    rows: part.rows.map((r, j, all) => {
      const at = i++;
      const inRange = first >= 0 && at >= first && at <= last;
      const position =
        all.length === 1 ? 'only' : j === 0 ? 'first' : j === all.length - 1 ? 'last' : 'middle';
      return {
        ...r,
        box: part.tone ? { position, tone: part.tone } : null,
        rail: {
          above: inRange && at > first,
          below: inRange && at < last,
          dot: r.kind === 'track',
        },
      } as FlowRow;
    }),
  }));
}

function itemsOf(block: PlaylistBlock): PlaylistItem[] {
  return block.kind === 'section' || block.kind === 'group' ? block.items : [block];
}

function segmentOf(item: PlaylistItem): string | undefined {
  return item.kind === 'text' ? item.segmentId : item.rows[0]?.segmentId;
}

function firstSegment(block: PlaylistBlock): string | undefined {
  return block.kind === 'section' || block.kind === 'group'
    ? block.segmentId
    : segmentOf(itemsOf(block)[0]);
}

function lastSegment(block: PlaylistBlock): string | undefined {
  return block.kind === 'section' || block.kind === 'group'
    ? block.segmentId
    : segmentOf(itemsOf(block).at(-1) as PlaylistItem);
}

/** Whether a drop beside this block would leave the dragged thing where it is. */
function blockHolds(block: PlaylistBlock, dragging: DragSource): boolean {
  if (dragging.kind === 'segment')
    return firstSegment(block) === dragging.id || lastSegment(block) === dragging.id;
  // A loose block (a lone track, or text alone) that is the dragged entry.
  if (block.kind === 'section' || block.kind === 'group') return false;
  return block.kind === 'text'
    ? block.key === dragging.id
    : block.rows.some((r) => r.id === dragging.id);
}
