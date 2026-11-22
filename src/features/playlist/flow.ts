import type { GuideBlock } from '@/lib/guideMarkdown/types';
import type { BlockEdge, PlaylistBlock, PlaylistItem, PlaylistTrackGroupRow } from './blocks';
import type { DragSource, DropTarget } from './dragOps';

// The playlist's flow as one column of rows (PlaylistArticle renders them). Every
// row has the same two cells, the rail and the content, and rows sit flush: the
// spacing between blocks is rows too. So the rail is one line drawn piecewise,
// each row drawing its own height, and nothing about a row's kind or size can
// break it.
//
// The editor lays out the same rows as the read page, so opening it, or dragging
// in it, moves nothing. It adds only what's being written (the composer, a new
// intro), the Add zone at the end, the spans of its groups (an outline drawn
// around their rows, taking no room), and, on each row, where a drop on it
// would land. Pure, so tested (flow.test.ts).

/** Space between blocks, and between loose cards. */
export const BLOCK_SPACE = 16;
export const CARD_SPACE = 6;

/** A row's place in a section's (tinted) box. */
export type Box = { position: 'first' | 'middle' | 'last' | 'only'; tone: 'section' };

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

/**
 * The editor: where a drop on this row lands, by where on it the pointer is (its
 * top edge, its bottom edge, or a card's middle, which groups with it). Whether
 * a drop there would change anything is dropOps' to say, when it happens.
 */
export type RowDrops = { top?: DropTarget; bottom?: DropTarget; center?: DropTarget };

type RowBase = { key: string; rail: RailCell; box: Box | null; drop?: RowDrops };

export type FlowRow =
  | (RowBase & { kind: 'track'; row: PlaylistTrackGroupRow })
  | (RowBase & {
      kind: 'prose';
      owner: ProseOwner;
      prose: GuideBlock[];
      /** Its place in the flow, as the row a drop lands next to (text blocks). */
      dragRow?: { id: string; segmentId: string };
      /** What dragging it moves: itself as an entry, or as a segment's own text. */
      drag: DragSource;
    })
  | (RowBase & { kind: 'space'; height: number })
  /** The editor's composer, or its Add zone at the end. */
  | (RowBase & { kind: 'gap'; at: GapAt });

/**
 * Rows drawn together: a section (tinted), a group (the editor's outline around
 * an undescribed segment of two or more entries), or loose rows. A section or
 * group drags as one, by its label.
 */
export type FlowGroup = {
  key: string;
  segmentId?: string;
  tone?: 'section' | 'group';
  rows: FlowRow[];
};

export type FlowOptions = {
  /** The editor: groups, drop targets, an Add zone at the end, the composer after `insertAfter`. */
  editing?: boolean;
  /** A row key to open the composer after ('' for the very start). */
  insertAfter?: string | null;
  /**
   * An undescribed segment whose new intro is being written: it gets the (empty)
   * intro row a section has, above its first entry, for the field.
   */
  intro?: string | null;
};

type Draft = FlowRow extends infer R
  ? R extends FlowRow
    ? Omit<R, 'rail' | 'box'>
    : never
  : never;
/** A row while laid out: the section it's in, if any. */
type Placed = { row: Draft; section?: string };

/** The segment a row stands for: its entry's, a comment's section, or text alone's own. */
const segmentOf = (r: Draft): string | undefined =>
  r.kind === 'track'
    ? r.row.segmentId
    : r.kind === 'prose'
      ? (r.dragRow?.segmentId ?? (r.owner.kind === 'segment' ? r.owner.id : undefined))
      : undefined;

/** The entry a row is (a track, or a text entry): what a drop lands next to. */
const entryOf = (r: Draft): BlockEdge | undefined =>
  r.kind === 'track'
    ? { id: r.row.id, segmentId: r.row.segmentId }
    : r.kind === 'prose' && r.dragRow && r.dragRow.id !== r.dragRow.segmentId
      ? r.dragRow
      : undefined;

const edgeOf = (r: Draft): BlockEdge | undefined =>
  entryOf(r) ??
  (r.kind === 'prose'
    ? (r.dragRow ??
      (r.owner.kind === 'segment' ? { id: r.owner.id, segmentId: r.owner.id } : undefined))
    : undefined);

/** A segment's intro (a section's description), above its entries. */
const introRow = (key: string, segmentId: string, prose: GuideBlock[]): Draft => ({
  kind: 'prose',
  key,
  owner: { kind: 'segment', id: segmentId },
  prose,
  drag: { kind: 'prose', id: segmentId, role: 'intro' },
});

/** Rows for a block's items: tracks and text, `apart` inserting space between loose cards. */
function itemRows(items: PlaylistItem[], apart: boolean): Draft[] {
  const rows: Draft[] = [];
  for (const item of items) {
    if (item.kind === 'text') {
      // Text alone is a segment of its own (its key is the segment's); other text is
      // an entry in a segment of tracks.
      const alone = item.key === item.segmentId;
      rows.push({
        kind: 'prose',
        key: item.key,
        owner: { kind: 'text', id: item.key },
        prose: item.prose,
        dragRow: { id: item.key, segmentId: item.segmentId },
        drag: alone
          ? { kind: 'prose', id: item.segmentId, role: 'alone' }
          : { kind: 'entry', id: item.key },
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

/** The flow's rows, grouped by section and (in the editor) group. */
export function flowRows(
  blocks: readonly PlaylistBlock[],
  { editing = false, insertAfter = null, intro = null }: FlowOptions = {}
): FlowGroup[] {
  // The read page's rows, in order: blocks, with space between them.
  let placed: Placed[] = [];
  blocks.forEach((block, b) => {
    if (b > 0)
      placed.push({ row: { kind: 'space', key: `space:${block.key}`, height: BLOCK_SPACE } });
    if (block.kind === 'section') {
      // Its intro first, if it has one (a section boxed for its text may not).
      const rows = [
        ...(block.intro.length
          ? [introRow(`${block.key}:intro`, block.segmentId, block.intro)]
          : []),
        ...itemRows(block.items, false),
      ];
      placed.push(...rows.map((row) => ({ row, section: block.segmentId })));
    } else placed.push(...itemRows([block], true).map((row) => ({ row })));
  });

  if (editing) placed = editorRows(placed, { insertAfter, intro });

  // Each gap's neighbours, now that everything's in place.
  const edges = placed.map((p) => edgeOf(p.row));
  placed = placed.map((p, i) =>
    p.row.kind === 'gap'
      ? {
          ...p,
          row: {
            ...p.row,
            at: {
              ...p.row.at,
              above: edges.slice(0, i).findLast(Boolean),
              below: edges.slice(i + 1).find(Boolean),
            },
          },
        }
      : p
  );

  const groups = groupRows(placed, editing);
  const drops = editing ? dropTargets(placed, groups) : undefined;

  // The rail runs from the first track's dot to the last's.
  const first = placed.findIndex((p) => p.row.kind === 'track');
  const last = placed.findLastIndex((p) => p.row.kind === 'track');
  let i = 0;
  return groups.map((group) => ({
    ...group,
    rows: group.rows.map((draft, j, all) => {
      const at = i++;
      const inRange = first >= 0 && at >= first && at <= last;
      const position =
        all.length === 1 ? 'only' : j === 0 ? 'first' : j === all.length - 1 ? 'last' : 'middle';
      return {
        ...draft,
        box: group.tone === 'section' ? { position, tone: 'section' } : null,
        ...(drops?.[at] && { drop: drops[at] }),
        rail: {
          above: inRange && at > first,
          below: inRange && at < last,
          dot: draft.kind === 'track',
        },
      } as FlowRow;
    }),
  }));
}

/** The editor's additions: a new intro's row, the composer, and the Add zone at the end. */
function editorRows(
  placed: Placed[],
  { insertAfter, intro }: { insertAfter: string | null; intro: string | null }
): Placed[] {
  const out = [...placed];
  // A first intro (a group's, a lone track's, a section boxed for its text): above
  // its first entry, where it will show, and in its box if it has one.
  const hasIntroRow = out.some(
    (p) => p.row.kind === 'prose' && p.row.owner.kind === 'segment' && p.row.owner.id === intro
  );
  if (intro && !hasIntroRow) {
    const at = out.findIndex((p) => segmentOf(p.row) === intro);
    if (at >= 0)
      out.splice(at, 0, { row: introRow(`intro:${intro}`, intro, []), section: out[at].section });
  }
  if (insertAfter !== null) {
    const gap: Draft = { kind: 'gap', key: `gap:${insertAfter}`, at: { key: insertAfter } };
    const at = insertAfter ? out.findIndex((p) => p.row.key === insertAfter) : -1;
    // Inside a section, it's in the section.
    if (at >= 0) out.splice(at + 1, 0, { row: gap, section: out[at].section });
    else out.unshift({ row: gap });
  }
  // Before everything: a place to drop with no height (its target reaches up into
  // the space above the flow), so something can go first, even before a section.
  out.unshift({ row: { kind: 'space', key: 'space:start', height: 0 } });
  out.push({ row: { kind: 'gap', key: 'gap:end', at: { key: 'end' } } });
  return out;
}

/** Undescribed segments of two or more entries: groups, in the editor. */
function groupSegments(placed: Placed[]): Set<string> {
  const count = new Map<string, number>();
  for (const { row, section } of placed) {
    const entry = entryOf(row);
    const intro = row.kind === 'prose' && row.owner.kind === 'segment' ? row.owner.id : undefined;
    const segment = section ? undefined : (entry?.segmentId ?? intro);
    if (segment) count.set(segment, (count.get(segment) ?? 0) + 1);
  }
  return new Set([...count].filter(([, n]) => n > 1).map(([id]) => id));
}

/** Sections, the editor's groups, and the loose rows between them. */
function groupRows(
  placed: Placed[],
  editing: boolean
): (Omit<FlowGroup, 'rows'> & { rows: Draft[] })[] {
  const grouped = editing ? groupSegments(placed) : new Set<string>();
  const out: (Omit<FlowGroup, 'rows'> & { rows: Draft[] })[] = [];
  for (let i = 0; i < placed.length;) {
    const { row, section } = placed[i];
    if (section) {
      let j = i;
      while (j < placed.length && placed[j].section === section) j++;
      out.push({
        key: `section:${section}`,
        segmentId: section,
        tone: 'section',
        rows: placed.slice(i, j).map((p) => p.row),
      });
      i = j;
      continue;
    }
    const segment = segmentOf(row);
    if (segment && grouped.has(segment)) {
      // From its first row to its last, with the space between them.
      const end = placed.findLastIndex((p) => !p.section && segmentOf(p.row) === segment);
      out.push({
        key: `group:${segment}`,
        segmentId: segment,
        tone: 'group',
        rows: placed.slice(i, end + 1).map((p) => p.row),
      });
      i = end + 1;
      continue;
    }
    const last = out.at(-1);
    if (last && !last.tone) last.rows.push(row);
    else out.push({ key: `loose:${row.key}`, rows: [row] });
    i++;
  }
  return out;
}

/**
 * Where a drop on each row lands (by its index in `placed`). Next to an entry in
 * a section or group: into it, there. Next to anything else (a lone track, text
 * alone): a place of its own, between segments. A card's middle: into its
 * segment, after it (a lone track becomes a group). Space between rows: between
 * the rows around it, by the same rule.
 */
function dropTargets(
  placed: Placed[],
  groups: { tone?: string; segmentId?: string; rows: Draft[] }[]
) {
  const boxOf = new Map<Draft, string>();
  for (const g of groups)
    if (g.tone && g.segmentId) for (const r of g.rows) boxOf.set(r, g.segmentId);
  const segments = placed.map((p) => segmentOf(p.row));
  const segmentBefore = (i: number) => segments.slice(0, i).findLast((s) => s !== undefined);
  const segmentAfter = (i: number) => segments.slice(i + 1).find((s) => s !== undefined);
  const gap = (above?: string, below?: string): DropTarget => ({ kind: 'gap', above, below });
  const next = (entry: BlockEdge, edge: 'top' | 'bottom'): DropTarget => ({
    kind: 'row',
    rowId: entry.id,
    segmentId: entry.segmentId,
    edge,
  });

  return placed.map(({ row }, i): RowDrops | undefined => {
    const segment = segments[i];
    const box = boxOf.get(row);
    const entry = entryOf(row);
    if (entry) {
      const edges: RowDrops = box
        ? { top: next(entry, 'top'), bottom: next(entry, 'bottom') }
        : { top: gap(segmentBefore(i), segment), bottom: gap(segment, segmentAfter(i)) };
      return row.kind === 'track' ? { ...edges, center: next(entry, 'bottom') } : edges;
    }
    if (row.kind === 'prose' && segment) {
      // A section's intro: anywhere on it, into the section, before its first entry
      // (the intro always shows first, so that's where it lands: the line is drawn
      // under the intro). Before the section, on its own, is the space above the box.
      if (row.owner.kind === 'segment') {
        const below = placed.slice(i + 1).find((p) => entryOf(p.row)?.segmentId === segment);
        const first = below && entryOf(below.row);
        return first ? { bottom: next(first, 'top') } : undefined;
      }
      // Text alone.
      return { top: gap(segmentBefore(i), segment), bottom: gap(segment, segmentAfter(i)) };
    }
    if (row.kind === 'space') {
      const above = placed.slice(0, i).findLast((p) => segmentOf(p.row) !== undefined);
      const below = placed.slice(i + 1).find((p) => segmentOf(p.row) !== undefined);
      const aboveEntry = above && entryOf(above.row);
      // Within a group (between two of its entries): into it.
      if (aboveEntry && box && below && segmentOf(below.row) === aboveEntry.segmentId)
        return { center: next(aboveEntry, 'bottom') };
      return { center: gap(above && segmentOf(above.row), below && segmentOf(below.row)) };
    }
    return undefined;
  });
}
