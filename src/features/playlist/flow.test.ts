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

/** A compact picture of the rows: key, then the rail (│ above, ● dot, │ below). */
const picture = (rows: FlowRow[]) =>
  rows.map(
    (r) =>
      `${r.key}:${r.rail.above ? '│' : ' '}${r.rail.dot ? '●' : '·'}${r.rail.below ? '│' : ' '}`
  );

describe('flowRows', () => {
  it('runs the rail from the first track to the last, through everything between', () => {
    const rows = flowRows(blocks).flatMap((g) => g.rows);
    expect(picture(rows)).toEqual([
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
    const rows = groups.flatMap((g) => g.rows);
    const height = (key: string) => {
      const r = rows.find((x) => x.key === key);
      return r?.kind === 'space' ? r.height : null;
    };
    expect(height('space:section:s1')).toBe(BLOCK_SPACE);
    expect(height('space:d')).toBe(CARD_SPACE);
    const section = groups.find((g) => g.sectionId === 's1');
    expect(
      section?.rows.map((r) => (r.kind === 'track' || r.kind === 'prose' ? r.box : '-'))
    ).toEqual(['first', 'middle', 'last']);
  });

  it('puts the editor’s gaps between blocks, with the rows on either side', () => {
    const rows = flowRows(blocks, { gaps: true }).flatMap((g) => g.rows);
    const gaps = rows.filter((r) => r.kind === 'gap');
    expect(gaps.map((g) => g.key)).toEqual(['gap:0', 'gap:1', 'gap:2', 'gap:3', 'gap:4']);
    const second = gaps[2];
    expect(second.kind === 'gap' && second.at).toMatchObject({
      above: { id: 'b', segmentId: 's1' },
      below: { id: 'c', segmentId: 's2' },
    });
    // The rail passes through a gap between tracks, not one outside them.
    expect(second.rail).toEqual({ above: true, below: true, dot: false });
    expect(gaps[0].rail).toEqual({ above: false, below: false, dot: false });
  });

  it('draws a lone track as a dot alone', () => {
    const rows = flowRows([{ kind: 'tracks', key: 'x', rows: [track('x', 's')] }]).flatMap(
      (g) => g.rows
    );
    expect(rows[0].rail).toEqual({ above: false, below: false, dot: true });
  });
});
