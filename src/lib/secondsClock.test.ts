import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { secondsClock } from './secondsClock';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-03T21:00:00.400Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('secondsClock', () => {
  it('ticks on wall-clock second boundaries', async () => {
    const seen: number[] = [];
    const unsubscribe = secondsClock.subscribe(() => seen.push(Date.now() % 1000));

    await vi.advanceTimersByTimeAsync(3_000);
    unsubscribe();

    expect(seen).toEqual([0, 0, 0]);
  });

  it('notifies every subscriber from one timer, and stops when the last leaves', async () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = secondsClock.subscribe(a);
    const offB = secondsClock.subscribe(b);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    offB();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a stable snapshot between ticks', async () => {
    const off = secondsClock.subscribe(() => {});
    const first = secondsClock.getSnapshot();

    await vi.advanceTimersByTimeAsync(500); // to 21:00:00.900, no boundary crossed
    expect(secondsClock.getSnapshot()).toBe(first);

    await vi.advanceTimersByTimeAsync(200); // crosses 21:00:01
    expect(secondsClock.getSnapshot()).toBe(first + 1);
    off();
  });

  it('reads the wall clock when nothing is subscribed', () => {
    const before = secondsClock.getSnapshot();
    vi.setSystemTime(Date.now() + 5_000);
    expect(secondsClock.getSnapshot()).toBe(before + 5);
  });
});
