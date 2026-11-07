import { describe, expect, it, vi } from 'vitest';
import type { Entry, QueueChange, RepeatMode, TrackInfo } from 'gapless';
import { createEngine, type EngineCallbacks, type EngineEntry, type QueueLike } from './engine';

/**
 * A stand-in for gapless's Queue with the behaviour the engine relies on:
 * setEntries reconciles by key (a surviving current entry stays put, and isn't
 * restarted), change events arrive in a microtask, and next() moves on by itself.
 */
function fakeQueue() {
  let entries: Entry[] = [];
  let current: string | null = null;
  let playing = false;
  const listeners = new Set<(c: QueueChange) => void>();
  const statuses = new Map<string, TrackInfo['webAudioLoadingState']>();
  let pending = false;
  let repeat: RepeatMode = 'off';
  const emit = () => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      const change = { keys: entries.map((e) => e.key), currentKey: current, repeat };
      listeners.forEach((l) => l(change));
    });
  };
  const restarts: string[] = [];
  const q: QueueLike & { restarts: string[]; statuses: typeof statuses; endTrack(): void } = {
    restarts,
    statuses,
    setEntries(next, opts = {}) {
      entries = [...next];
      if (!current || !entries.some((e) => e.key === current)) {
        current =
          opts.startKey && entries.some((e) => e.key === opts.startKey)
            ? opts.startKey
            : (entries[0]?.key ?? null);
        if (current) restarts.push(current);
        playing = !!current && (opts.play ?? playing);
      }
      emit();
    },
    goto(key, opts = {}) {
      current = key;
      restarts.push(key);
      playing = opts.play ?? false;
      emit();
    },
    setRepeat: (mode) => {
      repeat = mode;
    },
    onChange(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    play: () => {
      if (current) playing = true;
    },
    pause: () => {
      playing = false;
    },
    next() {
      const i = entries.findIndex((e) => e.key === current);
      if (entries[i + 1]) {
        current = entries[i + 1].key;
        emit();
      }
    },
    endTrack() {
      this.next();
    },
    previous: () => {},
    seek: () => {},
    setVolume: () => {},
    resumeAudioContext: async () => {},
    destroy: () => {},
    get keys() {
      return entries.map((e) => e.key);
    },
    get currentKey() {
      return current;
    },
    get isPlaying() {
      return playing;
    },
    get tracks() {
      return entries.map(
        (e) => ({ key: e.key, webAudioLoadingState: statuses.get(e.key) ?? 'NONE' }) as TrackInfo
      );
    },
  };
  return q;
}

function setup() {
  const q = fakeQueue();
  const cb = {
    onAdvanced: vi.fn(),
    onProgress: vi.fn(),
    onPlayingChange: vi.fn(),
    onStatus: vi.fn(),
    onError: vi.fn(),
    onPlayBlocked: vi.fn(),
  } satisfies EngineCallbacks;
  const engine = createEngine(() => q, cb);
  return { q, cb, engine };
}

const entry = (key: string, url: string | null = `${key}.mp3`): EngineEntry => ({
  key,
  url,
  metadata: {},
});
const tick = () => new Promise<void>((r) => queueMicrotask(r));

describe('engine.sync', () => {
  it('puts the entries in gapless and starts at the current one', () => {
    const { q, engine } = setup();
    engine.sync({ entries: ['a', 'b', 'c'].map((k) => entry(k)), currentKey: 'b', repeat: 'off' });
    expect(q.keys).toEqual(['a', 'b', 'c']);
    expect(q.currentKey).toBe('b');
  });

  it('is a no-op for the playing entry when it runs again', async () => {
    const { q, engine } = setup();
    const input = {
      entries: ['a', 'b'].map((k) => entry(k)),
      currentKey: 'a',
      repeat: 'off' as const,
    };
    engine.sync(input);
    engine.play();
    engine.sync({ ...input, entries: [...input.entries, entry('n1')] });
    engine.sync(input);
    expect(q.restarts).toEqual(['a']);
    expect(q.isPlaying).toBe(true);
  });

  it('jumps when the state moves the current entry, keeping play state', () => {
    const { q, engine } = setup();
    const entries = ['a', 'b', 'c'].map((k) => entry(k));
    engine.sync({ entries, currentKey: 'a', repeat: 'off' });
    engine.play();
    engine.sync({ entries, currentKey: 'c', repeat: 'off' });
    expect(q.currentKey).toBe('c');
    expect(q.isPlaying).toBe(true);
  });

  it('leaves out entries without a URL', () => {
    const { q, engine } = setup();
    engine.sync({
      entries: [entry('a'), entry('b', null), entry('c')],
      currentKey: 'a',
      repeat: 'off',
    });
    expect(q.keys).toEqual(['a', 'c']);
  });

  it('leaves gapless alone while the current entry has no URL, and plays once it does', () => {
    const { q, engine } = setup();
    engine.sync({ entries: [entry('a', null), entry('b', null)], currentKey: 'a', repeat: 'off' });
    expect(q.keys).toEqual([]);
    engine.play(); // pressed before the URLs arrived
    expect(engine.wantsPlay).toBe(true);
    expect(q.isPlaying).toBe(false);

    engine.sync({ entries: [entry('a'), entry('b')], currentKey: 'a', repeat: 'off' });
    expect(q.currentKey).toBe('a');
    expect(q.isPlaying).toBe(true);
    expect(engine.wantsPlay).toBe(false);
  });

  it('starts a restored entry at its saved position, once', () => {
    const { q, engine } = setup();
    const goto = vi.spyOn(q, 'setEntries');
    engine.startAt('b', 42);
    engine.sync({ entries: [entry('a'), entry('b')], currentKey: 'b', repeat: 'off' });
    expect(goto.mock.calls[0][1]).toMatchObject({ startKey: 'b', startTime: 42 });
    engine.sync({ entries: [entry('a'), entry('b'), entry('c')], currentKey: 'b', repeat: 'off' });
    expect(goto.mock.calls[1][1]?.startTime).toBeUndefined();
  });

  it('passes the repeat mode through', () => {
    const { q, engine } = setup();
    const setRepeat = vi.spyOn(q, 'setRepeat');
    engine.sync({ entries: [entry('a')], currentKey: 'a', repeat: 'all' });
    expect(setRepeat).toHaveBeenCalledWith('all');
  });
});

describe('engine → machine', () => {
  it('reports when gapless moves on by itself', async () => {
    const { q, cb, engine } = setup();
    engine.sync({ entries: ['a', 'b'].map((k) => entry(k)), currentKey: 'a', repeat: 'off' });
    await tick();
    expect(cb.onAdvanced).not.toHaveBeenCalled();
    q.endTrack();
    await tick();
    expect(cb.onAdvanced).toHaveBeenCalledWith('b');
  });

  it("doesn't echo its own jumps", async () => {
    const { cb, engine } = setup();
    const entries = ['a', 'b', 'c'].map((k) => entry(k));
    engine.sync({ entries, currentKey: 'a', repeat: 'off' });
    engine.sync({ entries, currentKey: 'c', repeat: 'off' });
    await tick();
    expect(cb.onAdvanced).not.toHaveBeenCalled();
  });

  it('a click in the same tick as a track ending wins', async () => {
    const { q, cb, engine } = setup();
    const entries = ['a', 'b', 'c'].map((k) => entry(k));
    engine.sync({ entries, currentKey: 'a', repeat: 'off' });
    await tick();
    q.endTrack(); // gapless moves to b; its change event is still pending
    engine.sync({ entries, currentKey: 'c', repeat: 'off' }); // the click
    await tick();
    expect(q.currentKey).toBe('c');
    expect(cb.onAdvanced).not.toHaveBeenCalled();
  });

  it('reports load states only when they change', async () => {
    const { q, cb, engine } = setup();
    engine.sync({ entries: ['a', 'b'].map((k) => entry(k)), currentKey: 'a', repeat: 'off' });
    expect(cb.onStatus).toHaveBeenLastCalledWith({ a: 'NONE', b: 'NONE' });
    const calls = cb.onStatus.mock.calls.length;
    await tick();
    expect(cb.onStatus.mock.calls.length).toBe(calls); // the change event, same statuses
    q.statuses.set('b', 'LOADED');
    q.endTrack();
    await tick();
    expect(cb.onStatus).toHaveBeenLastCalledWith({ a: 'NONE', b: 'LOADED' });
  });

  it('reports playing changes', () => {
    const { cb, engine } = setup();
    engine.sync({ entries: [entry('a')], currentKey: 'a', repeat: 'off' });
    engine.play();
    engine.pause();
    expect(cb.onPlayingChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it('toggle pauses a pending play', () => {
    const { engine } = setup();
    engine.sync({ entries: [entry('a', null)], currentKey: 'a', repeat: 'off' });
    engine.toggle();
    expect(engine.wantsPlay).toBe(true);
    engine.toggle();
    expect(engine.wantsPlay).toBe(false);
  });
});
