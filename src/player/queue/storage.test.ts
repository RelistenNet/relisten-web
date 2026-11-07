import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyQueue, type QueueState } from './model';
import { createQueueStorage, OWNER_KEY, POSITION_KEY, QUEUE_KEY } from './storage';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const queue = (repeat: QueueState['repeat']): QueueState => ({ ...emptyQueue, repeat });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('queue storage', () => {
  it('round-trips the queue, debounced', () => {
    const storage = memoryStorage();
    const s = createQueueStorage({ storage, tabId: 'a', now: () => Date.now() });
    s.saveQueue(queue('one'));
    s.saveQueue(queue('all'));
    expect(storage.data.has(QUEUE_KEY)).toBe(false);
    vi.advanceTimersByTime(250);
    expect(JSON.parse(storage.data.get(QUEUE_KEY) ?? 'null')).toMatchObject({
      version: 2,
      queue: { repeat: 'all' },
    });
    expect(s.loadQueue()).toEqual(queue('all'));
  });

  it('ignores an unknown version or a malformed queue', () => {
    const storage = memoryStorage();
    const s = createQueueStorage({ storage, tabId: 'a' });
    // Version 1 queues had no mp3 URLs; they're ignored.
    storage.setItem(QUEUE_KEY, JSON.stringify({ version: 1, queue: queue('all') }));
    expect(s.loadQueue()).toBeNull();
    storage.setItem(QUEUE_KEY, JSON.stringify({ version: 2, queue: { upNext: 'nope' } }));
    expect(s.loadQueue()).toBeNull();
    storage.setItem(QUEUE_KEY, '{not json');
    expect(s.loadQueue()).toBeNull();
  });

  it('throttles position writes and ends on the latest one', () => {
    const storage = memoryStorage();
    const s = createQueueStorage({ storage, tabId: 'a', now: () => Date.now() });
    s.savePosition({ key: 'k', time: 1 });
    expect(s.loadPosition()).toMatchObject({ key: 'k', time: 1 });
    s.savePosition({ key: 'k', time: 2 });
    s.savePosition({ key: 'k', time: 3 });
    expect(s.loadPosition()?.time).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(s.loadPosition()?.time).toBe(3);
  });

  it('only the owning tab writes; starting playback elsewhere takes over', () => {
    const storage = memoryStorage();
    const a = createQueueStorage({ storage, tabId: 'a' });
    const b = createQueueStorage({ storage, tabId: 'b' });
    a.claim();
    a.saveQueue(queue('one'));
    b.saveQueue(queue('all'));
    vi.advanceTimersByTime(250);
    expect(a.loadQueue()?.repeat).toBe('one');

    b.claim();
    expect(JSON.parse(storage.data.get(OWNER_KEY) ?? 'null').tabId).toBe('b');
    a.saveQueue(queue('off'));
    b.saveQueue(queue('all'));
    vi.advanceTimersByTime(250);
    expect(a.loadQueue()?.repeat).toBe('all');
    b.savePosition({ key: 'x', time: 9 });
    a.savePosition({ key: 'y', time: 1 });
    expect(JSON.parse(storage.data.get(POSITION_KEY) ?? 'null').key).toBe('x');
  });

  it('asks for the tab id only when ownership matters', () => {
    const storage = memoryStorage();
    const tabId = vi.fn(() => 'lazy');
    const s = createQueueStorage({ storage, tabId });
    s.loadQueue();
    s.loadPosition();
    s.flush();
    expect(tabId).not.toHaveBeenCalled();
    s.claim();
    s.saveQueue(queue('one'));
    vi.advanceTimersByTime(250);
    expect(tabId).toHaveBeenCalledTimes(1);
    expect(s.loadQueue()?.repeat).toBe('one');
  });

  it('taking over ownership writes the queue and position saved while not the owner', () => {
    const storage = memoryStorage();
    const a = createQueueStorage({ storage, tabId: 'a' });
    const b = createQueueStorage({ storage, tabId: 'b' });
    a.claim();
    a.saveQueue(queue('one'));
    vi.advanceTimersByTime(250);
    // b edits its queue and plays on while a owns storage: held back…
    b.saveQueue(queue('all'));
    b.savePosition({ key: 'b-track', time: 42 });
    vi.advanceTimersByTime(1000);
    expect(a.loadQueue()?.repeat).toBe('one');
    // …then b starts playback: its queue and position must land together.
    b.claim();
    expect(a.loadQueue()?.repeat).toBe('all');
    expect(a.loadPosition()).toMatchObject({ key: 'b-track', time: 42 });
  });

  it('reclaiming ownership writes this tab’s queue, even after its own save completed', () => {
    const storage = memoryStorage();
    const a = createQueueStorage({ storage, tabId: 'a' });
    const b = createQueueStorage({ storage, tabId: 'b' });
    a.claim();
    a.saveQueue(queue('one'));
    a.savePosition({ key: 'a-track', time: 5 });
    vi.advanceTimersByTime(1000); // a's saves complete: nothing pending
    b.claim();
    b.saveQueue(queue('all'));
    b.savePosition({ key: 'b-track', time: 9 });
    vi.advanceTimersByTime(1000);
    expect(a.loadQueue()?.repeat).toBe('all');
    // a resumes playback without editing its queue.
    a.claim();
    expect(a.loadQueue()?.repeat).toBe('one');
    expect(a.loadPosition()).toMatchObject({ key: 'a-track', time: 5 });
  });

  it('flush writes pending changes immediately', () => {
    const storage = memoryStorage();
    const s = createQueueStorage({ storage, tabId: 'a' });
    s.saveQueue(queue('one'));
    s.flush();
    expect(s.loadQueue()?.repeat).toBe('one');
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
        removeItem: () => {},
      },
      tabId: 'a',
    });
    expect(s.loadQueue()).toBeNull();
    s.saveQueue(queue('one'));
    expect(() => vi.advanceTimersByTime(250)).not.toThrow();
  });
});
