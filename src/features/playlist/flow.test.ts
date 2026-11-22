import { describe, expect, it } from 'vitest';
import type { PlaylistBlock, PlaylistTrackGroupRow } from './blocks';
import { BLOCK_SPACE, CARD_SPACE, type FlowRow, flowRows } from './flow';

const track = (id: string, segmentId: string) =>
  ({ id, segmentId, kind: 'track' }) as unknown as PlaylistTrackGroupRow;
const prose = [{ type: 'paragraph' as const, children: [{ type: 'text' as const, value: 'x' }] }];

// Intro text | section s1 (a, b, comment) | loose: c, d (group s2), e (alone, s3) | closing text
const blocks: PlaylistBlock[] = [
  { kind: 'text', key: 'intro', segmentId: 'intro', prose },
  {
    kind: 'section',
    key: 'section:s1',
    segmentId: 's1',
    items: [{ kind: 'tracks', key: 'a', rows: [track('a', 's1'), track('b', 's1')] }],
    comment: prose,
  },
  { kind: 'tracks', key: 'c', rows: [track('c', 's2'), track('d', 's2'), track('e', 's3')] },
  { kind: 'text', key: 'outro', segmentId: 'outro', prose },
];

const rowsOf = (groups: ReturnType<typeof flowRows>) => groups.flatMap((g) => g.rows);
const keys = (groups: ReturnType<typeof flowRows>) => rowsOf(groups).map((r) => r.key);
const row = (groups: ReturnType<typeof flowRows>, key: string) =>
  rowsOf(groups).find((r) => r.key === key) as FlowRow;
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
      'd:│●│',
      'space:e:│·│',
      'e:│● ',
      'space:outro: · ',
      'outro: · ',
    ]);
  });

  it('spaces blocks and loose cards, and boxes a section flush', () => {
    const groups = flowRows(blocks);
    const height = (key: string) => {
      const r = row(groups, key);
      return r.kind === 'space' ? r.height : null;
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

  it('lays out the editor with the read page’s rows: opening it moves nothing', () => {
    const read = keys(flowRows(blocks));
    const edit = keys(flowRows(blocks, { editing: true }));
    // Only a zero-height drop place at the start and the Add zone at the end are new.
    expect(edit).toEqual(['space:start', ...read, 'gap:end']);
    expect(row(flowRows(blocks, { editing: true }), 'space:start')).toMatchObject({ height: 0 });
  });

  it('outlines a segment of two or more entries as a group, in the editor only', () => {
    expect(flowRows(blocks).some((g) => g.tone === 'group')).toBe(false);
    const group = flowRows(blocks, { editing: true }).find((g) => g.tone === 'group');
    expect(group).toMatchObject({ key: 'group:s2', segmentId: 's2' });
    expect(group?.rows.map((r) => r.key)).toEqual(['c', 'space:d', 'd']);
  });

  it('says where a drop on each row lands, by its edges and a card’s middle', () => {
    const groups = flowRows(blocks, { editing: true });
    // In a section (or group): next to the entry, inside it.
    expect(row(groups, 'a').drop).toEqual({
      top: { kind: 'row', rowId: 'a', segmentId: 's1', edge: 'top' },
      bottom: { kind: 'row', rowId: 'a', segmentId: 's1', edge: 'bottom' },
      center: { kind: 'row', rowId: 'a', segmentId: 's1', edge: 'bottom' },
    });
    expect(row(groups, 'd').drop?.top).toEqual({
      kind: 'row',
      rowId: 'd',
      segmentId: 's2',
      edge: 'top',
    });
    // A lone track: on its own, either side of it; its middle makes a group.
    expect(row(groups, 'e').drop).toEqual({
      top: { kind: 'gap', above: 's2', below: 's3' },
      bottom: { kind: 'gap', above: 's3', below: 'outro' },
      center: { kind: 'row', rowId: 'e', segmentId: 's3', edge: 'bottom' },
    });
    // Space inside a group: into it; between blocks: on its own there.
    expect(row(groups, 'space:d').drop).toEqual({
      center: { kind: 'row', rowId: 'c', segmentId: 's2', edge: 'bottom' },
    });
    expect(row(groups, 'space:c').drop).toEqual({
      center: { kind: 'gap', above: 's1', below: 's2' },
    });
    // Before everything.
    expect(row(groups, 'space:start').drop).toEqual({
      center: { kind: 'gap', above: undefined, below: 'intro' },
    });
    // A section's comment, anywhere on it: into the section, after its last entry.
    expect(row(groups, 'section:s1:comment').drop).toEqual({
      top: { kind: 'row', rowId: 'b', segmentId: 's1', edge: 'bottom' },
    });
    // Readers get none.
    expect(rowsOf(flowRows(blocks)).some((r) => r.drop)).toBe(false);
  });

  it('puts the composer after the row it was opened from, in its section', () => {
    const groups = flowRows(blocks, { editing: true, insertAfter: 'a' });
    expect(groups.find((g) => g.segmentId === 's1')?.rows.map((r) => r.key)).toEqual([
      'a',
      'gap:a',
      'b',
      'section:s1:comment',
    ]);
    const gap = row(groups, 'gap:a');
    expect(gap.kind === 'gap' && gap.at).toEqual({
      key: 'a',
      above: { id: 'a', segmentId: 's1' },
      below: { id: 'b', segmentId: 's1' },
    });
  });

  it('lays out a new intro’s row under its segment’s last entry, in its group', () => {
    const lone = flowRows(blocks, { editing: true, intro: 's3' });
    expect(keys(lone).indexOf('intro:s3')).toBe(keys(lone).indexOf('e') + 1);
    // A lone track with an intro being written is outlined as a group while it is.
    expect(lone.find((g) => g.key === 'group:s3')?.rows.map((r) => r.key)).toEqual([
      'e',
      'intro:s3',
    ]);
    const intro = row(lone, 'intro:s3');
    expect(intro.kind === 'prose' && intro.owner).toEqual({ kind: 'segment', id: 's3' });
    // A section has its own already.
    expect(keys(flowRows(blocks, { editing: true, intro: 's1' }))).not.toContain('intro:s1');
  });
});
