import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyQueue, type QueueState } from './model';
import { createQueueStorage, QUEUE_KEY, STORAGE_VERSION } from './storage';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

/** A queue told apart by its cursor. */
const queue = (cursor: string): QueueState => ({ ...emptyQueue, cursor });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('queue storage', () => {
  it('round-trips the queue, debounced', () => {
    const storage = memoryStorage();
    const s = createQueueStorage({ storage });
    s.saveQueue(queue('one'));
    s.saveQueue(queue('two'));
    expect(storage.data.has(QUEUE_KEY)).toBe(false);
    vi.advanceTimersByTime(250);
    expect(JSON.parse(storage.data.get(QUEUE_KEY) ?? 'null')).toMatchObject({
      version: STORAGE_VERSION,
      queue: { cursor: 'two' },
    });
    expect(s.loadQueue()).toEqual(queue('two'));
  });

  it('ignores an unknown version or a malformed queue', () => {
    const storage = memoryStorage();
    const s = createQueueStorage({ storage });
    storage.setItem(QUEUE_KEY, JSON.stringify({ version: 2, queue: queue('old') }));
    expect(s.loadQueue()).toBeNull();
    storage.setItem(
      QUEUE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, queue: { upNext: 'nope' } })
    );
    expect(s.loadQueue()).toBeNull();
    storage.setItem(QUEUE_KEY, '{not json');
    expect(s.loadQueue()).toBeNull();
  });

  it('throttles position writes and ends on the latest one', () => {
    const s = createQueueStorage({ storage: memoryStorage() });
    s.savePosition({ key: 'k', time: 1 });
    expect(s.loadPosition()).toMatchObject({ key: 'k', time: 1 });
    s.savePosition({ key: 'k', time: 2 });
    s.savePosition({ key: 'k', time: 3 });
    expect(s.loadPosition()?.time).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(s.loadPosition()?.time).toBe(3);
  });

  it('flush writes pending changes immediately', () => {
    const s = createQueueStorage({ storage: memoryStorage() });
    s.saveQueue(queue('one'));
    s.flush();
    expect(s.loadQueue()?.cursor).toBe('one');
  });

  it('survives a storage that throws', () => {
    const s = createQueueStorage({
      storage: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('quota');
        },
      },
    });
    expect(s.loadQueue()).toBeNull();
    s.saveQueue(queue('one'));
    expect(() => vi.advanceTimersByTime(250)).not.toThrow();
  });
});
