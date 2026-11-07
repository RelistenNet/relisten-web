// ---------------------------------------------------------------------------
// Saving the queue in localStorage.
//
//   relisten.queue     { version, updatedAt, queue: QueueState }, debounced
//   relisten.position  { key, time, duration, updatedAt }, throttled: it
//                      changes every frame, so it isn't part of the big blob
//   relisten.owner     { tabId, at }: the tab that last started playback
//
// Only the owner writes, so two open tabs don't overwrite each other's queue.
// Another tab takes over when it starts playback. Items carry their mp3 URL,
// so a restored queue plays with no request.
// ---------------------------------------------------------------------------

import type { QueueState } from './model';

export const QUEUE_KEY = 'relisten.queue';
export const POSITION_KEY = 'relisten.position';
export const OWNER_KEY = 'relisten.owner';
/** 2: items carry their mp3Url. Older saved queues are ignored. */
export const STORAGE_VERSION = 2;

export type SavedPosition = { key: string; time: number; duration?: number };

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createQueueStorage({
  storage,
  tabId,
  now = () => Date.now(),
  debounceMs = 250,
  throttleMs = 1000,
}: {
  storage: StorageLike;
  /** This tab's id, or a function that makes it (called only when ownership matters). */
  tabId: string | (() => string);
  now?: () => number;
  debounceMs?: number;
  throttleMs?: number;
}) {
  let id: string | null = typeof tabId === 'string' ? tabId : null;
  const thisTab = () => (id ??= typeof tabId === 'string' ? tabId : tabId());

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

  /** No owner yet counts as ours: the first tab to save takes it. */
  const isOwner = () => {
    const owner = read<{ tabId: string }>(OWNER_KEY);
    return !owner || owner.tabId === thisTab();
  };

  let queueTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingQueue: QueueState | null = null;
  /** The last queue and position this tab was given, kept after they're written. */
  let latestQueue: QueueState | null = null;
  let latestPosition: SavedPosition | null = null;
  let lastPositionAt = Number.NEGATIVE_INFINITY;
  let pendingPosition: SavedPosition | null = null;
  let positionTimer: ReturnType<typeof setTimeout> | null = null;

  const flushQueue = () => {
    if (queueTimer) clearTimeout(queueTimer);
    queueTimer = null;
    if (!pendingQueue || !isOwner()) return;
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
    if (!pendingPosition || !isOwner()) return;
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
      latestQueue = queue;
      if (queueTimer) clearTimeout(queueTimer);
      queueTimer = setTimeout(flushQueue, debounceMs);
    },

    /** At most once per `throttleMs`, always ending on the latest position. */
    savePosition(position: SavedPosition) {
      pendingPosition = position;
      latestPosition = position;
      const wait = lastPositionAt + throttleMs - now();
      if (wait <= 0) flushPosition();
      else if (!positionTimer) positionTimer = setTimeout(flushPosition, wait);
    },

    /** Write anything pending now (the page is hiding). */
    flush() {
      flushQueue();
      flushPosition();
    },

    /**
     * This tab started playback: it owns the saved queue from now on. Anything
     * it saved while another tab owned storage is written now, so the queue
     * and the position stored next to it are both this tab's.
     */
    claim() {
      write(OWNER_KEY, { tabId: thisTab(), at: new Date(now()).toISOString() });
      // Always this tab's latest, not only what's pending: another tab may
      // have written its own queue since this tab's last save completed.
      if (latestQueue) pendingQueue = latestQueue;
      if (latestPosition) pendingPosition = latestPosition;
      flushQueue();
      flushPosition();
    },

    isOwner,
  };
}

export type QueueStorage = ReturnType<typeof createQueueStorage>;
