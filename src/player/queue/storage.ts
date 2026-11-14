// ---------------------------------------------------------------------------
// Saving the queue in localStorage.
//
//   relisten.queue     { version, updatedAt, queue: QueueState }, debounced
//   relisten.position  { key, time, duration, updatedAt }, throttled: it
//                      changes every frame, so it isn't part of the big blob
//
// With two tabs open, whichever saved last wins. Items carry their mp3 URL,
// so a restored queue plays with no request.
// ---------------------------------------------------------------------------

import type { QueueState } from './model';

export const QUEUE_KEY = 'relisten.queue';
export const POSITION_KEY = 'relisten.position';
/** 3: keyed by trackId, no context ref, shuffle or repeat. Older saved queues are ignored. */
export const STORAGE_VERSION = 3;

export type SavedPosition = { key: string; time: number; duration?: number };

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function createQueueStorage({
  storage,
  now = () => Date.now(),
  debounceMs = 250,
  throttleMs = 1000,
}: {
  storage: StorageLike;
  now?: () => number;
  debounceMs?: number;
  throttleMs?: number;
}) {
  const read = <T>(key: string): T | null => {
    try {
      const raw = storage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  };
  const write = (key: string, value: unknown) => {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or a private window: saving is best-effort.
    }
  };

  let queueTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingQueue: QueueState | null = null;
  let lastPositionAt = Number.NEGATIVE_INFINITY;
  let pendingPosition: SavedPosition | null = null;
  let positionTimer: ReturnType<typeof setTimeout> | null = null;

  const flushQueue = () => {
    if (queueTimer) clearTimeout(queueTimer);
    queueTimer = null;
    if (!pendingQueue) return;
    write(QUEUE_KEY, {
      version: STORAGE_VERSION,
      updatedAt: new Date(now()).toISOString(),
      queue: pendingQueue,
    });
    pendingQueue = null;
  };

  const flushPosition = () => {
    if (positionTimer) clearTimeout(positionTimer);
    positionTimer = null;
    if (!pendingPosition) return;
    lastPositionAt = now();
    write(POSITION_KEY, { ...pendingPosition, updatedAt: new Date(lastPositionAt).toISOString() });
    pendingPosition = null;
  };

  return {
    /** The saved queue, or null if none (or an unknown version). */
    loadQueue(): QueueState | null {
      const saved = read<{ version?: number; queue?: QueueState }>(QUEUE_KEY);
      if (saved?.version !== STORAGE_VERSION || !saved.queue) return null;
      const q = saved.queue;
      if (!Array.isArray(q.upNext) || (q.context && !Array.isArray(q.context.items))) return null;
      return q;
    },

    loadPosition(): SavedPosition | null {
      const p = read<SavedPosition>(POSITION_KEY);
      return p && typeof p.key === 'string' && Number.isFinite(p.time) ? p : null;
    },

    /** Save after `debounceMs` of quiet. */
    saveQueue(queue: QueueState) {
      pendingQueue = queue;
      if (queueTimer) clearTimeout(queueTimer);
      queueTimer = setTimeout(flushQueue, debounceMs);
    },

    /** At most once per `throttleMs`, always ending on the latest position. */
    savePosition(position: SavedPosition) {
      pendingPosition = position;
      const wait = lastPositionAt + throttleMs - now();
      if (wait <= 0) flushPosition();
      else if (!positionTimer) positionTimer = setTimeout(flushPosition, wait);
    },

    /** Write anything pending now (the page is hiding). */
    flush() {
      flushQueue();
      flushPosition();
    },
  };
}

export type QueueStorage = ReturnType<typeof createQueueStorage>;
