import { describe, expect, it } from 'vitest';
import { applyOp } from '@/domain/playlistOps';
import type { PlaylistContent, PlaylistOp } from '@/domain/playlists';
import { dropOp, type DragSource, type DropTarget } from './dragOps';

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
const drop = (source: DragSource, target: DropTarget) => {
  const op = dropOp(content, source, target, () => 'new');
  return op && shape(applyOp(content, op as PlaylistOp).content);
};
const entry = (id: string): DragSource => ({ kind: 'entry', id });
const segment = (id: string): DragSource => ({ kind: 'segment', id });
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
