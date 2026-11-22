import { describe, expect, it } from 'vitest';
import { applyOp } from '@/domain/playlistOps';
import type { PlaylistContent, PlaylistOp } from '@/domain/playlists';
import { dropOp, dropOps, type DragSource, type DropTarget } from './dragOps';

// s1 (section: e1, e2) | s2 (prose alone) | s3 (e3, e4)
const content: PlaylistContent = {
  playlistId: 'p',
  generation: 'g',
  revision: 1,
  name: 'Mix',
  segments: [
    {
      id: 's1',
      description: 'Intro',
      entries: [
        { id: 'e1', trackId: 'a' },
        { id: 'e2', trackId: 'b' },
      ],
    },
    { id: 's2', description: 'Interlude', entries: [] },
    {
      id: 's3',
      entries: [
        { id: 'e3', trackId: 'c' },
        { id: 'e4', trackId: 'd' },
      ],
    },
  ],
};

const shape = (c: PlaylistContent) =>
  c.segments.map((s) => `${s.id}:${s.entries.map((e) => e.id).join(',')}`).join(' | ');
const drop = (source: Exclude<DragSource, { kind: 'prose' }>, target: DropTarget) => {
  const op = dropOp(content, source, target, () => 'new');
  return op && shape(applyOp(content, op as PlaylistOp).content);
};
const entry = (id: string) => ({ kind: 'entry', id }) as const;
const segment = (id: string) => ({ kind: 'segment', id }) as const;
const row = (rowId: string, segmentId: string, edge: 'top' | 'bottom'): DropTarget => ({
  kind: 'row',
  rowId,
  segmentId,
  edge,
});

describe('dropOp', () => {
  it('drops an entry above or below a row, in that row’s group', () => {
    expect(drop(entry('e4'), row('e1', 's1', 'top'))).toBe('s1:e4,e1,e2 | s2: | s3:e3');
    expect(drop(entry('e1'), row('e3', 's3', 'bottom'))).toBe('s1:e2 | s2: | s3:e3,e1,e4');
  });

  it('drops next to prose alone as a group of its own', () => {
    expect(drop(entry('e3'), row('s2', 's2', 'top'))).toBe('s1:e1,e2 | new:e3 | s2: | s3:e4');
    expect(drop(entry('e1'), row('s2', 's2', 'bottom'))).toBe('s1:e2 | s2: | new:e1 | s3:e3,e4');
  });

  it('drops into a gap between groups as a group of its own', () => {
    expect(drop(entry('e4'), { kind: 'gap', above: 's1', below: 's2' })).toBe(
      's1:e1,e2 | new:e4 | s2: | s3:e3'
    );
    expect(drop(entry('e4'), { kind: 'gap', below: 's1' })).toBe('new:e4 | s1:e1,e2 | s2: | s3:e3');
  });

  it('moves a whole section', () => {
    expect(drop(segment('s1'), row('e4', 's3', 'bottom'))).toBe('s2: | s3:e3,e4 | s1:e1,e2');
    expect(drop(segment('s3'), { kind: 'gap', below: 's1' })).toBe('s3:e3,e4 | s1:e1,e2 | s2:');
  });

  it('does nothing dropped onto itself', () => {
    expect(dropOp(content, entry('e1'), row('e1', 's1', 'top'))).toBeNull();
    expect(dropOp(content, segment('s1'), row('e2', 's1', 'bottom'))).toBeNull();
    expect(dropOp(content, segment('s1'), { kind: 'gap', above: 's1', below: 's2' })).toBeNull();
  });
});

describe('dropOps: prose', () => {
  const applyAll = (ops: PlaylistOp[]) =>
    shape(ops.reduce((c, o) => applyOp(c, o).content, content));
  const ids = () => {
    let n = 0;
    return () => `n${++n}`;
  };

  it('moves a section’s intro out to stand alone between groups', () => {
    const ops = dropOps(
      content,
      { kind: 'prose', id: 's1', role: 'intro' },
      { kind: 'gap', above: 's2', below: 's3' },
      ids()
    );
    const after = ops.reduce((c, o) => applyOp(c, o).content, content);
    expect(shape(after)).toBe('s1:e1,e2 | s2: | n1: | s3:e3,e4');
    expect(after.segments.find((s) => s.id === 's1')?.description).toBeUndefined();
    expect(after.segments.find((s) => s.id === 'n1')?.description).toBe('Intro');
  });

  it('moves text alone into a group as a text entry', () => {
    expect(
      applyAll(
        dropOps(
          content,
          { kind: 'prose', id: 's2', role: 'alone' },
          row('e3', 's3', 'bottom'),
          ids()
        )
      )
    ).toBe('s1:e1,e2 | s3:e3,n1,e4');
  });

  it('moves text alone between groups as itself, and an intro into its own section as text', () => {
    expect(
      applyAll(
        dropOps(content, { kind: 'prose', id: 's2', role: 'alone' }, { kind: 'gap', below: 's1' })
      )
    ).toBe('s2: | s1:e1,e2 | s3:e3,e4');
    expect(
      applyAll(
        dropOps(content, { kind: 'prose', id: 's1', role: 'intro' }, row('e3', 's3', 'top'), ids())
      )
    ).toBe('s1:e1,e2 | s2: | s3:n1,e3,e4');
  });
});
