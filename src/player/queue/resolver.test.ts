import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem } from './model';
import type { UrlMap } from './items';
import { createUrlResolver } from './resolver';

const item = (n: number, showId = `show${n}`): QueueItem => ({
  key: `k${n}`,
  trackId: `t${n}`,
  sourceId: 'src',
  showId,
  artistSlug: 'gd',
  artistName: 'GD',
  date: '1977-05-08',
  trackSlug: `s${n}`,
  title: `S${n}`,
});

function setup(list: QueueItem[], current: QueueItem | null = list[0] ?? null) {
  const known = new Map<string, string>();
  const fetchUrls = vi.fn(async (shows: string[]): Promise<UrlMap> => {
    const urls: UrlMap = {};
    for (const i of list)
      if (shows.includes(i.showId)) urls[i.trackId] = { mp3Url: `${i.trackId}.mp3`, flacUrl: null };
    return urls;
  });
  const onResolved = vi.fn();
  const resolver = createUrlResolver({
    has: (id) => known.has(id),
    add: (urls) => Object.entries(urls).forEach(([id, u]) => known.set(id, u.mp3Url ?? '')),
    fetchUrls,
    latest: () => ({ list, current }),
    onResolved,
    batchSize: 2,
    retryMs: 30_000,
  });
  return { resolver, fetchUrls, onResolved, known };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('url resolver', () => {
  it('fetches missing shows, current first, in batches', async () => {
    const list = [item(1), item(2), item(3)];
    const { resolver, fetchUrls, known, onResolved } = setup(list, list[2]);
    await resolver.kick();
    expect(fetchUrls.mock.calls.map((c) => c[0])).toEqual([['show3', 'show1'], ['show2']]);
    expect(known.size).toBe(3);
    expect(onResolved).toHaveBeenCalledTimes(2);
  });

  it('does nothing when every URL is known', async () => {
    const { resolver, fetchUrls, known } = setup([item(1)]);
    known.set('t1', 'x');
    await resolver.kick();
    expect(fetchUrls).not.toHaveBeenCalled();
  });

  it("doesn't request a show that's already in flight", async () => {
    const { resolver, fetchUrls } = setup([item(1)]);
    const a = resolver.kick();
    const b = resolver.kick();
    await Promise.all([a, b]);
    expect(fetchUrls).toHaveBeenCalledTimes(1);
  });

  it('retries a failed request on its own, without a queue change', async () => {
    const { resolver, fetchUrls, known } = setup([item(1)]);
    fetchUrls.mockRejectedValueOnce(new Error('503'));
    await resolver.kick();
    expect(known.size).toBe(0);
    await resolver.kick(); // within the backoff: no request
    expect(fetchUrls).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchUrls).toHaveBeenCalledTimes(2);
    expect(known.has('t1')).toBe(true);
  });

  it('force (pressing Play) retries at once, within the backoff', async () => {
    const { resolver, fetchUrls, known } = setup([item(1)]);
    fetchUrls.mockRejectedValueOnce(new Error('offline'));
    await resolver.kick();
    await resolver.kick({ force: true });
    expect(fetchUrls).toHaveBeenCalledTimes(2);
    expect(known.has('t1')).toBe(true);
    await vi.advanceTimersByTimeAsync(30_000); // the scheduled retry was cancelled
    expect(fetchUrls).toHaveBeenCalledTimes(2);
  });

  it('keeps retrying while it keeps failing', async () => {
    const { resolver, fetchUrls } = setup([item(1)]);
    fetchUrls.mockRejectedValue(new Error('down'));
    await resolver.kick();
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchUrls).toHaveBeenCalledTimes(3);
  });
});
