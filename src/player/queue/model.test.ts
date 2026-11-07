import { describe, expect, it } from 'vitest';
import {
  addToQueue,
  refreshContext,
  restoreOnto,
  advanceTo,
  compose,
  contextOrder,
  emptyQueue,
  jumpTo,
  move,
  playContext,
  playNext,
  remove,
  sameRef,
  seededOrder,
  setRepeat,
  setShuffle,
  view,
  type ContextRef,
  type QueueContext,
  type QueueItem,
  type QueueState,
} from './model';

// ---- fixtures ---------------------------------------------------------------

const item = (key: string, trackId = key): QueueItem => ({
  key,
  trackId,
  sourceId: 'src',
  showId: 'show',
  artistSlug: 'grateful-dead',
  artistName: 'Grateful Dead',
  date: '1977-05-08',
  trackSlug: trackId,
  title: trackId,
  mp3Url: `https://archive.org/${trackId}.mp3`,
});

const showRef = (showId = 'show-1'): ContextRef => ({ kind: 'show', showId, sourceId: 'src' });

/** A show context of tracks t1…tn, keyed `${prefix}1`…. */
const show = (n: number, prefix = 'c', ref = showRef()): QueueContext => ({
  ref,
  label: 'Grateful Dead · 1977-05-08',
  items: Array.from({ length: n }, (_, i) => item(`${prefix}${i + 1}`, `t${i + 1}`)),
});

const keys = (items: QueueItem[]) => items.map((i) => i.key);
const composed = (s: QueueState) => keys(compose(s));

/** Playing c2 of a 4-track show. */
const playing = () => playContext(emptyQueue, show(4), 'c2');

// ---- compose ----------------------------------------------------------------

describe('compose', () => {
  it('is the context in order, with history before the current entry', () => {
    expect(composed(playing())).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('puts Next up right after a current context entry', () => {
    const s = addToQueue(playing(), [item('n1'), item('n2')]);
    expect(composed(s)).toEqual(['c1', 'c2', 'n1', 'n2', 'c3', 'c4']);
  });

  it('puts a current Next up entry after the cursor, then the rest of Next up', () => {
    let s = addToQueue(playing(), [item('n1'), item('n2')]);
    s = advanceTo(s, 'n1');
    expect(composed(s)).toEqual(['c1', 'c2', 'n1', 'n2', 'c3', 'c4']);
    expect(s.cursor).toBe('c2');
  });

  it('with only Next up and no context, is current then Next up', () => {
    const s = addToQueue(emptyQueue, [item('n1'), item('n2'), item('n3')]);
    expect(s.current?.key).toBe('n1');
    expect(composed(s)).toEqual(['n1', 'n2', 'n3']);
  });

  it('is empty for an empty queue', () => {
    expect(compose(emptyQueue)).toEqual([]);
  });
});

// ---- playing a context --------------------------------------------------------

describe('playContext', () => {
  it('replaces the context and keeps Next up', () => {
    let s = addToQueue(playing(), [item('n1')]);
    s = playContext(s, show(3, 'd', showRef('show-2')), 'd1');
    expect(s.current).toMatchObject({ key: 'd1', from: 'context' });
    expect(s.cursor).toBe('d1');
    expect(composed(s)).toEqual(['d1', 'n1', 'd2', 'd3']);
  });

  it('reuses keys when the same context plays again, so gapless keeps their audio', () => {
    const s = playing();
    // The page builds fresh items (fresh keys) for the same show.
    const again = playContext(s, show(4, 'fresh'), 'fresh4');
    expect(composed(again)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(again.current?.key).toBe('c4');
  });

  it("doesn't reuse keys for a different context", () => {
    const s = playContext(playing(), show(2, 'x', showRef('show-2')), 'x1');
    expect(composed(s)).toEqual(['x1', 'x2']);
  });

  it('re-anchors the shuffle at the start entry', () => {
    let s = setShuffle(playing(), 7);
    s = playContext(s, show(5, 'd', showRef('show-2')), 'd3', { seed: 9 });
    expect(s.shuffle).toEqual({ seed: 9, anchorKey: 'd3' });
    expect(composed(s)[0]).toBe('d3');
  });

  it('playing the current entry of the same context again changes nothing', () => {
    // The URL follows playback; the page then reports the track already playing.
    let s = setShuffle(playContext(emptyQueue, show(20), 'c3'), 11);
    s = advanceTo(s, composed(s)[1]);
    const current = s.current?.key;
    const order = composed(s);
    const again = playContext(s, show(20, 'fresh'), `fresh${current?.slice(1)}`, { seed: 99 });
    expect(again.current?.key).toBe(current);
    expect(again.shuffle).toEqual(s.shuffle);
    expect(composed(again)).toEqual(order);
  });

  it('throws if a context key collides with Next up', () => {
    const s = addToQueue(playing(), [item('n1')]);
    const clash: QueueContext = { ...show(1, 'z', showRef('show-2')), items: [item('n1')] };
    expect(() => playContext(s, clash, 'n1')).toThrow(/duplicate key "n1"/);
  });
});

describe('refreshContext', () => {
  it('fills in the full list behind a one-item placeholder without moving current', () => {
    const ref = showRef('song-ish');
    const placeholder: QueueContext = { ref, label: 'Dark Star', items: [item('p1', 't3')] };
    let s = addToQueue(playContext(emptyQueue, placeholder, 'p1'), [item('n1')]);
    s = refreshContext(s, {
      ref,
      label: 'Dark Star',
      items: ['t1', 't2', 't3', 't4'].map((t) => item(`f-${t}`, t)),
    });
    expect(s.current?.key).toBe('p1'); // kept: gapless doesn't skip a beat
    expect(composed(s)).toEqual(['f-t1', 'f-t2', 'p1', 'n1', 'f-t4']);
  });

  it('ignores a different context', () => {
    const s = playing();
    expect(refreshContext(s, show(2, 'x', showRef('other')))).toBe(s);
  });
});

describe('restoreOnto', () => {
  const saved = () =>
    setRepeat(setShuffle(addToQueue(playing(), [item('n1'), item('n2')]), 5), 'all');

  it('restores the saved queue when the page started nothing', () => {
    expect(restoreOnto(emptyQueue, saved())).toEqual(saved());
  });

  it('keeps what the page started, and carries over Next up, repeat and shuffle', () => {
    const page = playContext(emptyQueue, show(3, 'p', showRef('show-2')), 'p2');
    const s = restoreOnto(page, saved());
    expect(s.current?.key).toBe('p2');
    expect(keys(s.upNext)).toEqual(['n1', 'n2']);
    expect(s.repeat).toBe('all');
    expect(s.shuffle).toEqual({ seed: 5, anchorKey: 'p2' });
    expect(composed(s).slice(0, 3)).toEqual(['p2', 'n1', 'n2']);
  });
});

// ---- Next up ------------------------------------------------------------------

describe('playNext / addToQueue', () => {
  it('playNext goes to the front of Next up, addToQueue to the end', () => {
    let s = addToQueue(playing(), [item('a')]);
    s = playNext(s, [item('b')]);
    s = addToQueue(s, [item('c')]);
    expect(s.upNext.map((i) => i.key)).toEqual(['b', 'a', 'c']);
  });

  it('the same track can be queued twice under different keys', () => {
    const s = addToQueue(playing(), [item('n1', 't1'), item('n2', 't1')]);
    expect(composed(s)).toEqual(['c1', 'c2', 'n1', 'n2', 'c3', 'c4']);
  });

  it('rejects a key already in the queue', () => {
    expect(() => addToQueue(playing(), [item('c3')])).toThrow(/duplicate key "c3"/);
  });
});

// ---- advancing ------------------------------------------------------------------

describe('advanceTo', () => {
  it('playing through Next up drops each entry once playback moves past it', () => {
    let s = addToQueue(playing(), [item('n1'), item('n2')]);
    s = advanceTo(s, 'n1');
    s = advanceTo(s, 'n2');
    expect(composed(s)).toEqual(['c1', 'c2', 'n2', 'c3', 'c4']);
    s = advanceTo(s, 'c3');
    expect(composed(s)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(s.upNext).toEqual([]);
    expect(s.cursor).toBe('c3');
  });

  it('jumping to a later Next up entry drops the ones before it', () => {
    let s = addToQueue(playing(), [item('n1'), item('n2'), item('n3')]);
    s = jumpTo(s, 'n3');
    expect(composed(s)).toEqual(['c1', 'c2', 'n3', 'c3', 'c4']);
  });

  it('jumping back into the context keeps pending Next up after it', () => {
    let s = addToQueue(playing(), [item('n1')]);
    s = jumpTo(s, 'c1');
    expect(composed(s)).toEqual(['c1', 'n1', 'c2', 'c3', 'c4']);
  });

  it('previous() from a current Next up entry lands on the cursor and drops it', () => {
    let s = addToQueue(playing(), [item('n1')]);
    s = advanceTo(s, 'n1');
    s = advanceTo(s, 'c2'); // gapless went back to the entry before n1
    expect(composed(s)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('ignores unknown keys and the current key', () => {
    const s = playing();
    expect(advanceTo(s, 'nope')).toBe(s);
    expect(advanceTo(s, 'c2')).toBe(s);
  });
});

// ---- editing ----------------------------------------------------------------------

describe('move / remove', () => {
  const withQueue = () => addToQueue(playing(), [item('a'), item('b'), item('c')]);

  it('moves within Next up', () => {
    expect(keys(move(withQueue(), 'c', { after: 'start' }).upNext)).toEqual(['c', 'a', 'b']);
    expect(keys(move(withQueue(), 'a', { after: 'b' }).upNext)).toEqual(['b', 'a', 'c']);
  });

  it('ignores moves of unknown entries or to unknown anchors', () => {
    const s = withQueue();
    expect(move(s, 'nope', { after: 'start' })).toBe(s);
    expect(move(s, 'a', { after: 'nope' })).toBe(s);
  });

  it('removes from Next up and from the context', () => {
    let s = remove(withQueue(), 'b');
    s = remove(s, 'c4');
    expect(composed(s)).toEqual(['c1', 'c2', 'a', 'c', 'c3']);
  });

  it("can't remove the current entry", () => {
    const s = withQueue();
    expect(remove(s, 'c2')).toBe(s);
  });

  it('removing the cursor moves it back, so playback continues from the same place', () => {
    let s = addToQueue(playing(), [item('n1')]);
    s = advanceTo(s, 'n1'); // cursor stays c2
    s = remove(s, 'c2');
    expect(s.cursor).toBe('c1');
    expect(composed(s)).toEqual(['c1', 'n1', 'c3', 'c4']);
  });
});

// ---- shuffle and repeat -------------------------------------------------------------

describe('shuffle', () => {
  const big = () => playContext(emptyQueue, show(30), 'c5');

  it('anchors the current entry first and shuffles the rest', () => {
    const s = setShuffle(big(), 42);
    const order = composed(s);
    expect(order[0]).toBe('c5');
    expect([...order].sort()).toEqual(composed(big()).sort());
    expect(order).not.toEqual(composed(big()));
  });

  it('is reproducible from the seed and anchor (a reload)', () => {
    const s = setShuffle(big(), 42);
    const reloaded: QueueState = JSON.parse(JSON.stringify(s));
    expect(composed(reloaded)).toEqual(composed(s));
  });

  it('turning it off restores the natural order', () => {
    const s = setShuffle(setShuffle(big(), 42), null);
    expect(composed(s)).toEqual(composed(big()));
  });

  it('removing an entry leaves every other entry where it was', () => {
    const s = setShuffle(big(), 42);
    const before = composed(s).filter((k) => k !== 'c17');
    expect(composed(remove(s, 'c17'))).toEqual(before);
  });

  it('never shuffles Next up', () => {
    let s = addToQueue(big(), [item('n1'), item('n2'), item('n3')]);
    s = setShuffle(s, 42);
    expect(composed(s).slice(0, 4)).toEqual(['c5', 'n1', 'n2', 'n3']);
  });

  it('anchors at the cursor when a Next up entry is current', () => {
    let s = addToQueue(big(), [item('n1')]);
    s = advanceTo(s, 'n1');
    s = setShuffle(s, 3);
    expect(s.shuffle?.anchorKey).toBe('c5');
    expect(composed(s).slice(0, 2)).toEqual(['c5', 'n1']);
  });

  it('seededOrder depends on the seed', () => {
    const items = show(20).items;
    expect(keys(seededOrder(items, 1))).not.toEqual(keys(seededOrder(items, 2)));
  });
});

describe('repeat', () => {
  it('is stored as state; the wrap itself is gapless’s job', () => {
    const s = setRepeat(playing(), 'all');
    expect(s.repeat).toBe('all');
    expect(setRepeat(s, 'all')).toBe(s);
  });
});

describe('view', () => {
  it('splits the queue the way the panel shows it', () => {
    let s = addToQueue(playing(), [item('n1')]);
    expect(view(s)).toMatchObject({
      current: { key: 'c2' },
      upNext: [{ key: 'n1' }],
      label: 'Grateful Dead · 1977-05-08',
    });
    expect(keys(view(s).nextFromContext)).toEqual(['c3', 'c4']);
    s = advanceTo(s, 'n1');
    expect(keys(view(s).nextFromContext)).toEqual(['c3', 'c4']);
  });
});

describe('sameRef', () => {
  it('compares by value, ignoring key order and undefined fields', () => {
    const a: ContextRef = {
      kind: 'song',
      artistSlug: 'gd',
      songSlug: 'dark-star',
      params: { year: '1972', sort: 'date' },
    };
    const b: ContextRef = {
      kind: 'song',
      artistSlug: 'gd',
      songSlug: 'dark-star',
      params: { sort: 'date', year: '1972' },
    };
    expect(sameRef(a, b)).toBe(true);
    expect(sameRef(a, { ...b, params: { year: '1973', sort: 'date' } })).toBe(false);
    expect(sameRef(undefined, a)).toBe(false);
  });
});

// ---- fuzz -----------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The structure every state must have; see compose(). */
function checkInvariants(s: QueueState, label: string) {
  const list = compose(s);
  const ks = keys(list);
  expect(new Set(ks).size, `${label}: duplicate keys ${ks}`).toBe(ks.length);
  if (!s.current) return;

  const at = ks.indexOf(s.current.key);
  expect(at, `${label}: current ${s.current.key} not in ${ks}`).not.toBe(-1);
  // Right after current: Next up, in order, then the rest of the context.
  const v = view(s);
  expect(ks.slice(at + 1), `${label}: after current`).toEqual([
    ...keys(v.upNext),
    ...keys(v.nextFromContext),
  ]);
  // A Next up entry is current only via `current`, never also in upNext.
  expect(keys(s.upNext)).not.toContain(s.current.key);
  if (s.current.from === 'context') expect(s.cursor).toBe(s.current.key);
}

describe('fuzz: random operations keep the structure', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i', (seed) => {
    const rand = mulberry32(seed);
    const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    let n = 0;
    const fresh = () => item(`k${++n}`, `t${Math.floor(rand() * 8)}`);
    const played = new Set<string>(); // Next up entries playback has moved past

    let s: QueueState = emptyQueue;
    for (let op = 0; op < 400; op++) {
      const before = s;
      const snapshot = JSON.stringify(s);
      const r = rand();
      let desc: string;
      if (r < 0.12) {
        const ctx = show(
          1 + Math.floor(rand() * 6),
          `c${op}-`,
          showRef(`show-${Math.floor(rand() * 3)}`)
        );
        // Same-ref contexts may get fresh items for tracks already queued.
        s = playContext(s, ctx, pick(ctx.items).key, { seed: op });
        desc = `playContext(${ctx.ref.kind === 'show' ? ctx.ref.showId : ''})`;
      } else if (r < 0.27) {
        const items = Array.from({ length: 1 + Math.floor(rand() * 2) }, fresh);
        s = rand() < 0.5 ? playNext(s, items) : addToQueue(s, items);
        desc = `queue(${keys(items)})`;
      } else if (r < 0.55) {
        // A natural advance: gapless moves to the next composed entry.
        const list = composed(s);
        const next = s.current ? list[list.indexOf(s.current.key) + 1] : list[0];
        if (!next) continue;
        if (s.current?.from === 'upNext') played.add(s.current.key);
        s = advanceTo(s, next);
        expect(s.current?.key, `seed ${seed} op ${op}: advance`).toBe(next);
        desc = `advance(${next})`;
      } else if (r < 0.65) {
        const k = pick(composed(s));
        if (!k) continue;
        if (s.current?.from === 'upNext' && k !== s.current.key) played.add(s.current.key);
        const skipped = s.upNext.slice(
          0,
          Math.max(
            0,
            s.upNext.findIndex((i) => i.key === k)
          )
        );
        skipped.forEach((i) => played.add(i.key));
        s = jumpTo(s, k);
        desc = `jumpTo(${k})`;
      } else if (r < 0.75) {
        const k = pick(composed(s));
        if (!k) continue;
        s = remove(s, k);
        desc = `remove(${k})`;
      } else if (r < 0.83) {
        const k = pick(keys(s.upNext));
        if (!k) continue;
        s = move(s, k, { after: rand() < 0.3 ? 'start' : (pick(keys(s.upNext)) ?? 'start') });
        desc = `move(${k})`;
      } else if (r < 0.93) {
        s = setShuffle(s, rand() < 0.3 ? null : op);
        desc = `shuffle(${s.shuffle?.seed ?? 'off'})`;
      } else {
        s = setRepeat(s, pick(['off', 'all', 'one'] as const));
        desc = 'repeat';
      }
      const label = `seed ${seed} op ${op} ${desc}`;
      checkInvariants(s, label);
      // Played Next up entries never come back.
      for (const k of composed(s)) expect(played.has(k), `${label}: ${k} replayed`).toBe(false);
      // Ops are pure: the previous state is untouched.
      expect(JSON.stringify(before), `${label}: mutated its input`).toBe(snapshot);
    }
  });
});

// Keep the pure-context helper honest against compose.
it('contextOrder is compose without Next up', () => {
  const s = setShuffle(playContext(emptyQueue, show(10), 'c4'), 5);
  expect(keys(contextOrder(s))).toEqual(composed(s));
});
