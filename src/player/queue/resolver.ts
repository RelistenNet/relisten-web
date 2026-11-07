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
  /**
   * Stream URLs for these shows. Throws if the request fails; `failed` lists
   * shows the server couldn't load this time (retried like a failed request).
   */
  fetchUrls: (showIds: string[]) => Promise<{ urls: UrlMap; failed?: string[] }>;
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

  /**
   * Wake up when the earliest backoff among still-missing shows ends. Run
   * after every attempt, so failures at different times each get a retry
   * (one timer for the first failure would leave later ones behind).
   */
  const scheduleNext = () => {
    if (retryTimer) clearTimer(retryTimer);
    retryTimer = null;
    const missing = new Set(
      latest()
        .list.filter((i) => !has(i.trackId))
        .map((i) => i.showId)
    );
    let deadline = Number.POSITIVE_INFINITY;
    for (const [id, failed] of failedAt) {
      if (missing.has(id) && !inFlight.has(id)) deadline = Math.min(deadline, failed + retryMs);
    }
    if (deadline === Number.POSITIVE_INFINITY) return;
    retryTimer = setTimer(
      () => {
        retryTimer = null;
        void kick();
      },
      Math.max(0, deadline - now())
    );
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

    for (let i = 0; i < shows.length; i += batchSize) {
      const batch = shows.slice(i, i + batchSize);
      batch.forEach((id) => inFlight.add(id));
      try {
        const { urls, failed = [] } = await fetchUrls(batch);
        add(urls);
        for (const id of batch) {
          if (failed.includes(id)) failedAt.set(id, now());
          else failedAt.delete(id);
        }
      } catch {
        batch.forEach((id) => failedAt.set(id, now()));
      } finally {
        batch.forEach((id) => inFlight.delete(id));
      }
      onResolved();
    }
    scheduleNext();
  }

  return { kick };
}

export type UrlResolver = ReturnType<typeof createUrlResolver>;
