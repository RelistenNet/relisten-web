/**
 * A polling loop with no React or DOM dependencies; `usePolling` wires it to
 * the page. Guarantees:
 *
 * - At most one call in flight. A request to run while one is in flight is
 *   coalesced into a single follow-up once it settles, so responses can never
 *   arrive out of order.
 * - Every call settles: it's aborted after `timeoutMs`, so a stalled request
 *   can't stop the loop.
 * - Failures back off exponentially (capped at `maxBackoffMs`) until a call
 *   succeeds. Cancellations (pausing or stopping) don't count as failures.
 * - `resume()` only calls right away if the last success is older than the
 *   interval, so quickly switching tabs doesn't send a burst of requests.
 *
 * Deliberately not included (compared to TanStack Query): request dedup, a
 * shared cache, status flags, and retry-within-a-call. Each poll here has a
 * single consumer that keeps its last good data on failure, and the next tick
 * is the retry.
 */

export type PollerOptions = {
  run: (signal: AbortSignal) => Promise<void>;
  intervalMs: number;
  timeoutMs: number;
  maxBackoffMs: number;
  /** Time of the last successful call; shared across restarts so they don't reset staleness. */
  lastSuccess: { at: number };
  onError?: (err: unknown) => void;
};

export type Poller = {
  /** Start or continue: calls now if stale, otherwise waits out the rest of the interval. */
  resume: () => void;
  /** Stop scheduling and cancel the call in flight. `resume()` picks back up. */
  pause: () => void;
  /** Call now, ignoring staleness and backoff (e.g. the network just came back). */
  kick: () => void;
  /** Like pause, permanently. */
  stop: () => void;
};

class TimeoutError extends Error {
  name = 'TimeoutError';
}

export function createPoller({
  run,
  intervalMs,
  timeoutMs,
  maxBackoffMs,
  lastSuccess,
  onError,
}: PollerOptions): Poller {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: AbortController | undefined;
  let runAgainWhenSettled = false;
  let failures = 0;
  let active = false;
  let stopped = false;

  const delay = () => Math.min(intervalMs * 2 ** failures, Math.max(intervalMs, maxBackoffMs));

  const schedule = (ms: number) => {
    clearTimeout(timer);
    if (active && !stopped) timer = setTimeout(tick, ms);
  };

  async function tick() {
    if (!active || stopped) return;
    if (inFlight) {
      runAgainWhenSettled = true;
      return;
    }

    const controller = new AbortController();
    inFlight = controller;
    const timeout = setTimeout(() => controller.abort(new TimeoutError()), timeoutMs);

    try {
      await run(controller.signal);
      failures = 0;
      lastSuccess.at = Date.now();
    } catch (err) {
      // Aborted by pause/stop: not the endpoint's fault, so no backoff. A timeout is.
      const cancelled =
        controller.signal.aborted && !(controller.signal.reason instanceof TimeoutError);
      if (!cancelled) {
        failures++;
        onError?.(err);
      }
    } finally {
      clearTimeout(timeout);
      inFlight = undefined;
    }

    const again = runAgainWhenSettled;
    runAgainWhenSettled = false;
    schedule(again ? 0 : delay());
  }

  return {
    resume() {
      if (stopped) return;
      active = true;
      const elapsed = Date.now() - lastSuccess.at;
      schedule(Math.max(0, delay() - elapsed));
    },
    pause() {
      active = false;
      clearTimeout(timer);
      inFlight?.abort();
    },
    kick() {
      if (stopped) return;
      active = true;
      failures = 0;
      schedule(0);
    },
    stop() {
      stopped = true;
      active = false;
      clearTimeout(timer);
      inFlight?.abort();
    },
  };
}
