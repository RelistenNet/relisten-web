import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  compose,
  emptyQueue,
  playContext,
  type QueueContext,
  type QueueItem,
  type QueueState,
} from './model';

const item = (key: string): QueueItem => ({
  key,
  trackId: key,
  sourceId: 'src',
  showId: 'show',
  artistSlug: 'grateful-dead',
  artistName: 'Grateful Dead',
  date: '1977-05-08',
  trackSlug: key,
  title: key,
  mp3Url: `https://archive.org/${key}.mp3`,
});

/** A context of c1…cn. */
const ctx = (n: number, prefix = 'c'): QueueContext => ({
  label: 'Grateful Dead · 1977-05-08',
  items: Array.from({ length: n }, (_, i) => item(`${prefix}${i + 1}`)),
});

const composed = (s: QueueState) => compose(s).map((i) => i.key);

/** Playing c2 of a 4-track context. */
const playing = () => playContext(emptyQueue, ctx(4), 'c2');

/** Next up isn't built by any command yet (the queue panel adds it); set it directly. */
const withUpNext = (s: QueueState, ...keys: string[]): QueueState => ({
  ...s,
  upNext: keys.map(item),
});

describe('compose', () => {
  it('is the context in order, with history before the current entry', () => {
    expect(composed(playing())).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('puts Next up right after a current context entry', () => {
    expect(composed(withUpNext(playing(), 'n1', 'n2'))).toEqual([
      'c1',
      'c2',
      'n1',
      'n2',
      'c3',
      'c4',
    ]);
  });

  it('puts a current Next up entry after the cursor, then the rest of Next up', () => {
    const s = advanceTo(withUpNext(playing(), 'n1', 'n2'), 'n1');
    expect(composed(s)).toEqual(['c1', 'c2', 'n1', 'n2', 'c3', 'c4']);
    expect(s.cursor).toBe('c2');
  });

  it('is empty for an empty queue', () => {
    expect(compose(emptyQueue)).toEqual([]);
  });
});

describe('playContext', () => {
  it('starts at the start key, or the first item if it is missing', () => {
    expect(playing().current?.key).toBe('c2');
    expect(playContext(emptyQueue, ctx(3), 'nope').current?.key).toBe('c1');
  });

  it('replaces the context and keeps Next up', () => {
    const s = playContext(withUpNext(playing(), 'n1'), ctx(2, 'd'), 'd1');
    expect(composed(s)).toEqual(['d1', 'n1', 'd2']);
    expect(s.cursor).toBe('d1');
  });

  it('playing the same context again from the current entry changes nothing gapless sees', () => {
    const s = playing();
    const again = playContext(s, ctx(4), 'c2');
    expect(composed(again)).toEqual(composed(s));
    expect(again.current).toEqual(s.current);
  });

  it('drops duplicate keys, and keys already in Next up', () => {
    const dupes = { label: 'x', items: [item('a'), item('b'), item('a'), item('n1')] };
    const s = playContext(withUpNext(emptyQueue, 'n1'), dupes, 'a');
    expect(composed(s)).toEqual(['a', 'n1', 'b']);
  });

  it('an empty context clears the cursor and leaves the current entry', () => {
    const s = playContext(playing(), { label: 'x', items: [] }, 'c1');
    expect(s.cursor).toBeNull();
    expect(s.current?.key).toBe('c2');
  });
});

describe('advanceTo', () => {
  it('moves to a context entry and moves the cursor', () => {
    const s = advanceTo(playing(), 'c4');
    expect(s.current).toMatchObject({ key: 'c4', from: 'context' });
    expect(s.cursor).toBe('c4');
  });

  it('drops a played Next up entry, and the ones before a jumped-to entry', () => {
    let s = advanceTo(withUpNext(playing(), 'n1', 'n2', 'n3'), 'n2');
    expect(s.upNext.map((i) => i.key)).toEqual(['n3']);
    s = advanceTo(s, 'c3');
    expect(composed(s)).toEqual(['c1', 'c2', 'c3', 'n3', 'c4']);
  });

  it('ignores an unknown key and the current key', () => {
    const s = playing();
    expect(advanceTo(s, 'nope')).toBe(s);
    expect(advanceTo(s, 'c2')).toBe(s);
  });
});
