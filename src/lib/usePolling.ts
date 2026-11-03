'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `fn` every `intervalMs` while the tab is visible. Pauses when hidden,
 * runs immediately on becoming visible again, and aborts the in-flight call on
 * unmount. Calls never overlap: the next one is scheduled after the previous
 * one settles.
 */
export function usePolling(fn: (signal: AbortSignal) => Promise<void>, intervalMs: number) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let stopped = false;

    const schedule = () => {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === 'visible') {
        timer = setTimeout(tick, intervalMs);
      }
    };

    const tick = async () => {
      controller = new AbortController();
      try {
        await fnRef.current(controller.signal);
      } catch {
        // Transient network errors: keep polling.
      }
      schedule();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        tick();
      } else {
        clearTimeout(timer);
        controller?.abort();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
