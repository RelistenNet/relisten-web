// ---------------------------------------------------------------------------
// Fetching stream URLs for queued tracks that don't have them (after a
// reload, or a Next up item added without its URL). Batches by show, current
// entry first. A failed request is retried on its own after `retryMs`, and
// kick({ force: true }) (pressing Play) retries at once.
// ---------------------------------------------------------------------------

import type { QueueItem } from './model';
import type { UrlMap } from './items';

export function createUrlResolver({
  has,
  add,
  fetchUrls,
  latest,
  onResolved,
  batchSize,
  retryMs = 30_000,
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
}: {
  /** Whether a track's URL is known. */
  has: (trackId: string) => boolean;
  add: (urls: UrlMap) => void;
  /** Stream URLs for these shows (throws on failure). */
  fetchUrls: (showIds: string[]) => Promise<UrlMap>;
  /** The queue as it is now: the composed list and the current entry. */
  latest: () => { list: QueueItem[]; current: QueueItem | null };
  /** URLs arrived (sync the engine). */
  onResolved: () => void;
  batchSize: number;
  retryMs?: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}) {
  const inFlight = new Set<string>();
  const failedAt = new Map<string, number>();
  let retryTimer: unknown = null;

  const scheduleRetry = () => {
    if (retryTimer) return;
    retryTimer = setTimer(() => {
      retryTimer = null;
      void kick();
    }, retryMs);
  };

  /** Fetch what's missing. `force` ignores the backoff after a failure. */
  async function kick({ force = false }: { force?: boolean } = {}): Promise<void> {
    const { list, current } = latest();
    const missing = list.filter((i) => !has(i.trackId));
    if (!missing.length) return;

    const order = current && !has(current.trackId) ? [current, ...missing] : missing;
    const shows = [...new Set(order.map((i) => i.showId))].filter((id) => {
      if (inFlight.has(id)) return false;
      const failed = failedAt.get(id);
      return force || failed === undefined || now() - failed >= retryMs;
    });
    if (force && retryTimer) {
      clearTimer(retryTimer);
      retryTimer = null;
    }

    for (let i = 0; i < shows.length; i += batchSize) {
      const batch = shows.slice(i, i + batchSize);
      batch.forEach((id) => inFlight.add(id));
      try {
        add(await fetchUrls(batch));
        batch.forEach((id) => failedAt.delete(id));
      } catch {
        batch.forEach((id) => failedAt.set(id, now()));
        scheduleRetry();
      } finally {
        batch.forEach((id) => inFlight.delete(id));
      }
      onResolved();
    }
  }

  return { kick };
}

export type UrlResolver = ReturnType<typeof createUrlResolver>;
