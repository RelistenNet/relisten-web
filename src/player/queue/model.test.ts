import { describe, expect, it } from 'vitest';
import {
  addToQueue,
  advanceTo,
  compose,
  emptyQueue,
  move,
  nextUpKey,
  playContext,
  playNext,
  remove,
  upcoming,
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

describe('Next up', () => {
  /** A Next up entry for a context track: its own key, same track. */
  const next = (trackId: string, id = '1'): QueueItem => ({
    ...item(trackId),
    key: nextUpKey(trackId, id),
  });
  const upNextKeys = (s: QueueState) => s.upNext.map((i) => i.key);

  it('Play next goes to the front, Add to queue to the end, right after the current entry', () => {
    let s = addToQueue(playing(), [item('a')]);
    s = playNext(s, [item('b')]);
    s = addToQueue(s, [item('c')]);
    expect(composed(s)).toEqual(['c1', 'c2', 'b', 'a', 'c', 'c3', 'c4']);
  });

  it('a track already in the context can be queued (its own key)', () => {
    const s = playNext(playing(), [next('c4')]);
    expect(composed(s)).toEqual(['c1', 'c2', 'next:c4:1', 'c3', 'c4']);
  });

  it('skips keys already in the queue', () => {
    const s = addToQueue(playing(), [item('c3'), item('a'), item('a')]);
    expect(upNextKeys(s)).toEqual(['a']);
    expect(addToQueue(s, [item('a')])).toBe(s);
  });

  it('with nothing playing, the first item becomes current', () => {
    const s = addToQueue(emptyQueue, [item('a'), item('b')]);
    expect(s.current).toMatchObject({ key: 'a', from: 'upNext' });
    expect(composed(s)).toEqual(['a', 'b']);
  });

  it('moves within Next up, and ignores unknown keys', () => {
    const s = addToQueue(playing(), [item('a'), item('b'), item('c')]);
    expect(upNextKeys(move(s, 'c', 'start'))).toEqual(['c', 'a', 'b']);
    expect(upNextKeys(move(s, 'a', 'b'))).toEqual(['b', 'a', 'c']);
    expect(move(s, 'nope', 'start')).toBe(s);
    expect(move(s, 'a', 'nope')).toBe(s);
  });

  it('removes from Next up only', () => {
    const s = addToQueue(playing(), [item('a'), item('b')]);
    expect(upNextKeys(remove(s, 'a'))).toEqual(['b']);
    expect(remove(s, 'c3')).toBe(s); // a context entry: not removable here
  });

  it('a queued entry plays next, then is gone', () => {
    let s = playNext(playing(), [next('c4')]);
    s = advanceTo(s, 'next:c4:1');
    s = advanceTo(s, 'c3');
    expect(composed(s)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });
});

describe('upcoming', () => {
  it('splits the queue the way the panel shows it, after the current entry or the cursor', () => {
    let s = addToQueue(playing(), [item('a')]);
    expect(upcoming(s)).toMatchObject({ current: { key: 'c2' }, upNext: [{ key: 'a' }] });
    expect(upcoming(s).rest.map((i) => i.key)).toEqual(['c3', 'c4']);
    s = advanceTo(s, 'a'); // a Next up entry is current: the rest still follows the cursor (c2)
    expect(upcoming(s).rest.map((i) => i.key)).toEqual(['c3', 'c4']);
  });
});
