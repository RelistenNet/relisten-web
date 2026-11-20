import { describe, expect, it } from 'vitest';
import { applyOp } from '@/domain/playlistOps';
import type { PlaylistContent, PlaylistOp } from '@/domain/playlists';
import { insertText, moveEntry, moveToOwnGroup, removeText, saveProse } from './editOps';

// s1 (described: e1, e2) | s2 (prose alone) | s3 (e3, t1 a text entry, e4)
const content: PlaylistContent = {
  playlistId: 'playlist_x',
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
        { id: 't1', trackId: null, description: 'Words' },
        { id: 'e4', trackId: 'd' },
      ],
    },
  ],
};

const shape = (c: PlaylistContent) =>
  c.segments.map((s) => `${s.id}:${s.entries.map((e) => e.id).join(',')}`).join(' | ');
const after = (op: PlaylistOp | null) => {
  expect(op).not.toBeNull();
  const result = applyOp(content, op as PlaylistOp);
  expect(result.status).toBe('applied');
  return shape(result.content);
};
const id = () => 'new';

describe('moveEntry', () => {
  it('swaps inside a segment', () => {
    expect(after(moveEntry(content, 'e2', -1))).toBe('s1:e2,e1 | s2: | s3:e3,t1,e4');
    expect(after(moveEntry(content, 'e3', 1))).toBe('s1:e1,e2 | s2: | s3:t1,e3,e4');
  });

  it('hops over prose alone into a group of its own', () => {
    expect(after(moveEntry(content, 'e2', 1, id))).toBe('s1:e1 | s2: | new:e2 | s3:e3,t1,e4');
    expect(after(moveEntry(content, 'e3', -1, id))).toBe('s1:e1,e2 | new:e3 | s2: | s3:t1,e4');
  });

  it('crosses into the next group over', () => {
    const two: PlaylistContent = {
      ...content,
      segments: [content.segments[0], content.segments[2]],
    };
    const op = moveEntry(two, 'e3', -1);
    expect(shape(applyOp(two, op as PlaylistOp).content)).toBe('s1:e1,e2,e3 | s3:t1,e4');
    const down = moveEntry(two, 'e2', 1);
    expect(shape(applyOp(two, down as PlaylistOp).content)).toBe('s1:e1 | s3:e2,e3,t1,e4');
  });

  it('stops at the ends', () => {
    expect(moveEntry(content, 'e1', -1)).toBeNull();
    expect(moveEntry(content, 'e4', 1)).toBeNull();
  });
});

describe('moveToOwnGroup', () => {
  it('splits it out right after its group, unless it’s alone', () => {
    expect(after(moveToOwnGroup(content, 'e1', id))).toBe('s1:e2 | new:e1 | s2: | s3:e3,t1,e4');
    const alone: PlaylistContent = {
      ...content,
      segments: [{ id: 's9', entries: [{ id: 'x', trackId: 'a' }] }],
    };
    expect(moveToOwnGroup(alone, 'x')).toBeNull();
  });
});

describe('saveProse', () => {
  it('sets, changes and clears each kind of prose', () => {
    expect(saveProse(content, { kind: 'note', id: 'e1' }, '  A note ')).toEqual({
      operation_type: 'update_entry',
      payload: { entry_id: 'e1', description: 'A note' },
    });
    expect(saveProse(content, { kind: 'segment', id: 's1' }, '')).toEqual({
      operation_type: 'update_segment',
      payload: { segment_id: 's1', description: null },
    });
    expect(saveProse(content, { kind: 'playlist' }, 'About')).toEqual({
      operation_type: 'update_metadata',
      payload: { description: 'About' },
    });
  });

  it('removes a text block cleared of its text', () => {
    expect(after(saveProse(content, { kind: 'text', id: 't1' }, ' '))).toBe(
      's1:e1,e2 | s2: | s3:e3,e4'
    );
    expect(after(saveProse(content, { kind: 'text', id: 's2' }, ''))).toBe(
      's1:e1,e2 | s3:e3,t1,e4'
    );
  });

  it('does nothing when nothing changed', () => {
    expect(saveProse(content, { kind: 'segment', id: 's1' }, 'Intro ')).toBeNull();
    expect(saveProse(content, { kind: 'note', id: 'e1' }, '')).toBeNull();
  });
});

describe('insertText', () => {
  it('adds a text entry inside a group, and prose alone between groups', () => {
    const within = insertText(
      content,
      { above: { id: 'e3', segmentId: 's3' }, below: { segmentId: 's3' } },
      'Hi',
      id
    );
    expect(after(within)).toBe('s1:e1,e2 | s2: | s3:e3,new,t1,e4');
    const between = insertText(
      content,
      { above: { id: 'e2', segmentId: 's1' }, below: { segmentId: 's2' } },
      'Hi',
      id
    );
    expect(after(between)).toBe('s1:e1,e2 | new: | s2: | s3:e3,t1,e4');
    const top = insertText(content, { below: { segmentId: 's1' } }, 'Hi', id);
    expect(after(top)).toBe('new: | s1:e1,e2 | s2: | s3:e3,t1,e4');
    expect(insertText(content, {}, '   ')).toBeNull();
  });
});

describe('removeText', () => {
  it('removes a text entry or prose alone', () => {
    expect(after(removeText(content, 't1'))).toBe('s1:e1,e2 | s2: | s3:e3,e4');
    expect(after(removeText(content, 's2'))).toBe('s1:e1,e2 | s3:e3,t1,e4');
  });
});
