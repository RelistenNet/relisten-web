import { describe, expect, it } from 'vitest';
import { playlistBlocks } from './blocks';
import { flowRows } from './flow';
import type { PlaylistRow } from './spec';

const prose = [{ type: 'paragraph' as const, children: [{ type: 'text' as const, value: 'x' }] }];
const track = (id: string, segmentId: string) =>
  ({ id, segmentId, kind: 'track', segment: null }) as unknown as PlaylistRow;
const text = (id: string, segmentId: string) =>
  ({
    id,
    segmentId,
    kind: 'text',
    segment: null,
    description: 'x',
    prose,
  }) as unknown as PlaylistRow;

describe('playlistBlocks', () => {
  // s1: two tracks | s2: a track and a text entry | s3: text alone | s4, s5: lone tracks
  const rows = [
    track('a', 's1'),
    track('b', 's1'),
    track('c', 's2'),
    text('t', 's2'),
    text('s3', 's3'),
    track('d', 's4'),
    track('e', 's5'),
  ];

  it('boxes every segment of two or more entries, and nothing else', () => {
    expect(playlistBlocks(rows).map((b) => `${b.kind}:${b.key}`)).toEqual([
      'section:section:s1', // s1: two tracks, in a box
      'section:section:s2', // s2: a track and its writing, in a box
      'text:s3', // text alone stays alone
      'tracks:d', // s4 and s5 run together, loose
    ]);
    const boxed = playlistBlocks(rows)[1];
    expect(boxed.kind === 'section' && boxed.intro).toEqual([]);
  });

  it('gives a section without an intro no intro row, until one is written (in its box)', () => {
    const blocks = playlistBlocks(rows);
    const keys = (intro?: string) =>
      flowRows(blocks, { editing: true, intro })
        .find((g) => g.segmentId === 's2')
        ?.rows.map((r) => r.key);
    expect(keys()).toEqual(['c', 't']);
    expect(keys('s2')).toEqual(['intro:s2', 'c', 't']);
  });
});
