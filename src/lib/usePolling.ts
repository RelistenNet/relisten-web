'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPoller } from './poller';

export type PollingOptions = {
  /**
   * Call as soon as the component mounts. Turn off when the server just
   * rendered fresh data; the first call then waits one interval.
   */
  immediate?: boolean;
  /** Abort a call that hasn't settled after this long. */
  timeoutMs?: number;
  /** Ceiling for the backoff after consecutive failures. */
  maxBackoffMs?: number;
};

/**
 * Calls `fn` every `intervalMs` while the tab is visible; see `createPoller`
 * for the guarantees. `fn` should throw on failure (including non-OK
 * responses) so failures back off, and honor the signal so pausing can
 * cancel it. Hiding the tab pauses; showing it, or coming back online,
 * resumes.
 */
export function usePolling(
  fn: (signal: AbortSignal) => Promise<void>,
  intervalMs: number,
  { immediate = true, timeoutMs = 15_000, maxBackoffMs = 5 * 60_000 }: PollingOptions = {}
) {
  const run = useEffectEvent(fn);
  // Outlives effect re-runs, so changing an option doesn't reset staleness.
  const lastSuccess = useRef<{ at: number } | null>(null);

  useEffect(() => {
    lastSuccess.current ??= { at: immediate ? -Infinity : Date.now() };

    const poller = createPoller({
      run: (signal) => run(signal),
      intervalMs,
      timeoutMs,
      maxBackoffMs,
      lastSuccess: lastSuccess.current,
      onError: (err) => console.warn('[usePolling]', err),
    });

    const onVisibility = () =>
      document.visibilityState === 'visible' ? poller.resume() : poller.pause();
    const onOnline = () => {
      if (document.visibilityState === 'visible') poller.kick();
    };

    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    return () => {
      poller.stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
    // `immediate` only matters for the first run; it's read through the ref above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, timeoutMs, maxBackoffMs]);
}

/**
 * `usePolling` plus the state it fills: returns the latest value, starting at
 * `initial` (usually server-rendered). `fetchNext` gets the current value, so
 * it can request only what's new and merge it in.
 */
export function usePolled<T>(
  initial: T,
  fetchNext: (signal: AbortSignal, current: T) => Promise<T>,
  intervalMs: number,
  options?: PollingOptions
): T {
  const [value, setValue] = useState(initial);
  // The value the next call builds on. Updated as soon as a call resolves, not on
  // the following render, so a coalesced follow-up call never sees a stale one.
  const latest = useRef(initial);

  usePolling(
    async (signal) => {
      const next = await fetchNext(signal, latest.current);
      latest.current = next;
      setValue(next);
    },
    intervalMs,
    options
  );

  return value;
}
