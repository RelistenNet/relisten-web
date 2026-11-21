import { describe, expect, it } from 'vitest';
import type { PlaylistBlock, PlaylistTrackGroupRow } from './blocks';
import { BLOCK_SPACE, CARD_SPACE, type FlowRow, flowRows } from './flow';

const track = (id: string, segmentId: string) =>
  ({ id, segmentId, kind: 'track' }) as unknown as PlaylistTrackGroupRow;
const prose = [{ type: 'paragraph' as const, children: [{ type: 'text' as const, value: 'x' }] }];

// Intro text | section s1 (a, b, comment) | loose c, d | closing text
const blocks: PlaylistBlock[] = [
  { kind: 'text', key: 'intro', segmentId: 'intro', prose },
  {
    kind: 'section',
    key: 'section:s1',
    segmentId: 's1',
    items: [{ kind: 'tracks', key: 'a', rows: [track('a', 's1'), track('b', 's1')] }],
    comment: prose,
  },
  { kind: 'tracks', key: 'c', rows: [track('c', 's2'), track('d', 's2')] },
  { kind: 'text', key: 'outro', segmentId: 'outro', prose },
];

// The editor's view of three segments: a group (e, f) and two lone tracks (g, h).
const editorBlocks: PlaylistBlock[] = [
  {
    kind: 'group',
    key: 'group:s1',
    segmentId: 's1',
    items: [{ kind: 'tracks', key: 'e', rows: [track('e', 's1'), track('f', 's1')] }],
  },
  { kind: 'tracks', key: 'g', rows: [track('g', 's2')] },
  { kind: 'tracks', key: 'h', rows: [track('h', 's3')] },
];

const rowsOf = (groups: ReturnType<typeof flowRows>) => groups.flatMap((g) => g.rows);
/** A compact picture: key, then the rail (│ above, ● dot, │ below). */
const picture = (rows: FlowRow[]) =>
  rows.map(
    (r) =>
      `${r.key}:${r.rail.above ? '│' : ' '}${r.rail.dot ? '●' : '·'}${r.rail.below ? '│' : ' '}`
  );

describe('flowRows', () => {
  it('runs the rail from the first track to the last, through everything between', () => {
    expect(picture(rowsOf(flowRows(blocks)))).toEqual([
      'intro: · ',
      'space:section:s1: · ',
      'a: ●│',
      'b:│●│',
      'section:s1:comment:│·│',
      'space:c:│·│',
      'c:│●│',
      'space:d:│·│',
      'd:│● ',
      'space:outro: · ',
      'outro: · ',
    ]);
  });

  it('spaces blocks and loose cards, and boxes a section flush', () => {
    const groups = flowRows(blocks);
    const rows = rowsOf(groups);
    const height = (key: string) => {
      const r = rows.find((x) => x.key === key);
      return r?.kind === 'space' ? r.height : null;
    };
    expect(height('space:section:s1')).toBe(BLOCK_SPACE);
    expect(height('space:d')).toBe(CARD_SPACE);
    const section = groups.find((g) => g.segmentId === 's1');
    expect(section?.rows.map((r) => `${r.box?.tone}:${r.box?.position}`)).toEqual([
      'section:first',
      'section:middle',
      'section:last',
    ]);
  });

  it('opens drop zones only where a dragged track would move', () => {
    const rows = rowsOf(
      flowRows(editorBlocks, { editing: true, dragging: { kind: 'entry', id: 'g' } })
    );
    expect(rows.map((r) => r.key)).toEqual([
      'drop:gap:0',
      'group:s1:header',
      'drop:before:e',
      'e',
      'drop:after:e',
      'f',
      'drop:after:f',
      // Not either side of g itself (dropping there leaves it where it is): plain space.
      'space:g',
      'g',
      'space:h',
      'h',
      'drop:gap:end',
    ]);
    const into = rows.find((r) => r.key === 'drop:after:e');
    expect(into?.kind === 'drop' && into.target).toEqual({
      kind: 'row',
      rowId: 'e',
      segmentId: 's1',
      edge: 'bottom',
    });
    const before = rows.find((r) => r.key === 'drop:gap:0');
    expect(before?.kind === 'drop' && before.target).toEqual({
      kind: 'gap',
      above: undefined,
      below: 's1',
    });
  });

  it('offers a dragged section only the places between blocks', () => {
    const rows = rowsOf(
      flowRows(editorBlocks, { editing: true, dragging: { kind: 'segment', id: 's1' } })
    );
    expect(rows.filter((r) => r.kind === 'drop').map((r) => r.key)).toEqual([
      'drop:gap:2',
      'drop:gap:end',
    ]);
  });

  it('puts the composer after the row it was opened from, and an Add zone at the end', () => {
    const rows = rowsOf(flowRows(editorBlocks, { editing: true, insertAfter: 'e' }));
    expect(rows.map((r) => r.key)).toEqual([
      'group:s1:header',
      'e',
      'gap:e',
      'f',
      'space:g',
      'g',
      'space:h',
      'h',
      'gap:end',
    ]);
    const gap = rows[2];
    expect(gap.kind === 'gap' && gap.at).toEqual({
      key: 'e',
      above: { id: 'e', segmentId: 's1' },
      below: { id: 'f', segmentId: 's1' },
    });
    // The composer inside a group is in its box.
    expect(gap.box).toEqual({ position: 'middle', tone: 'group' });
  });
});
