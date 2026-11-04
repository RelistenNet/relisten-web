import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPoller, type PollerOptions } from './poller';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A call that only settles when its signal aborts. */
const hang = (signal: AbortSignal) =>
  new Promise<void>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));

const poller = (overrides: Partial<PollerOptions> & Pick<PollerOptions, 'run'>) =>
  createPoller({
    intervalMs: 1_000,
    timeoutMs: 10_000,
    maxBackoffMs: 60_000,
    lastSuccess: { at: -Infinity },
    ...overrides,
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createPoller', () => {
  it('calls immediately when stale, then every interval', async () => {
    const run = vi.fn(async () => {});
    const p = poller({ run });

    p.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(2);
    p.stop();
  });

  it('waits out the interval when the data is fresh', async () => {
    const run = vi.fn(async () => {});
    const p = poller({ run, lastSuccess: { at: Date.now() } });

    p.resume();
    await vi.advanceTimersByTimeAsync(999);
    expect(run).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    p.stop();
  });

  it('never overlaps calls, even when run ignores its signal', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const run = vi.fn(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await sleep(500); // ignores the signal entirely
      concurrent--;
    });
    const p = poller({ run, intervalMs: 100 });

    p.resume();
    await vi.advanceTimersByTimeAsync(10);
    // Tab hidden and shown again, plus the network coming back, all mid-call.
    p.pause();
    p.resume();
    p.kick();
    p.resume();
    await vi.advanceTimersByTimeAsync(3_000);

    expect(maxConcurrent).toBe(1);
    p.stop();
  });

  it('coalesces requests made while a call is in flight into one follow-up', async () => {
    const run = vi.fn(() => sleep(500));
    const p = poller({ run, intervalMs: 60_000 });

    p.resume();
    await vi.advanceTimersByTimeAsync(10);
    p.kick();
    p.kick();
    p.kick();
    await vi.advanceTimersByTimeAsync(1_100);

    expect(run).toHaveBeenCalledTimes(2);
    p.stop();
  });

  it('times out a hung call and keeps polling', async () => {
    const onError = vi.fn();
    const run = vi.fn(async (signal: AbortSignal) => {
      if (run.mock.calls.length === 1) await hang(signal);
    });
    const p = poller({ run, timeoutMs: 5_000, intervalMs: 1_000, onError });

    p.resume();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ name: 'TimeoutError' });

    // A timeout counts as a failure, so the next call waits one doubled interval.
    await vi.advanceTimersByTimeAsync(2_000);
    expect(run).toHaveBeenCalledTimes(2);
    p.stop();
  });

  it('backs off exponentially on failures, capped, and resets on success', async () => {
    const calledAt: number[] = [];
    const run = vi.fn(async () => {
      calledAt.push(Date.now());
      if (calledAt.length <= 5) throw new Error('500');
    });
    const p = poller({ run, intervalMs: 1_000, maxBackoffMs: 8_000, onError: () => {} });

    p.resume();
    await vi.advanceTimersByTimeAsync(60_000);
    p.stop();

    const gaps = calledAt.slice(1, 8).map((t, i) => t - calledAt[i]);
    // 5 failures: 2s, 4s, 8s, 8s (capped), 8s; then success → back to 1s.
    expect(gaps).toEqual([2_000, 4_000, 8_000, 8_000, 8_000, 1_000, 1_000]);
  });

  it('does not count pausing as a failure', async () => {
    const onError = vi.fn();
    const run = vi.fn((signal: AbortSignal) => hang(signal));
    const p = poller({ run, onError });

    p.resume();
    await vi.advanceTimersByTimeAsync(10);
    p.pause();
    await vi.advanceTimersByTimeAsync(10);

    expect(onError).not.toHaveBeenCalled();
    p.stop();
  });

  it('stop aborts the call in flight and nothing runs afterwards', async () => {
    let aborted = false;
    const run = vi.fn(async (signal: AbortSignal) => {
      signal.addEventListener('abort', () => (aborted = true));
      await sleep(500);
    });
    const p = poller({ run, intervalMs: 100 });

    p.resume();
    await vi.advanceTimersByTimeAsync(10);
    p.stop();
    p.resume();
    p.kick();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(aborted).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('keeps staleness across a restart (e.g. an interval change)', async () => {
    const lastSuccess = { at: -Infinity };
    const run = vi.fn(async () => {});

    const first = poller({ run, lastSuccess });
    first.resume();
    await vi.advanceTimersByTimeAsync(10);
    first.stop();

    const second = poller({ run, lastSuccess, intervalMs: 2_000 });
    second.resume();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(2);
    second.stop();
  });
});
