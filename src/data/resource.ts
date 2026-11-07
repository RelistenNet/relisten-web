import 'server-only';

import { cache as timberCache } from '@timber-js/app/cache';
import { deny } from '@timber-js/app/server';
import { cache as requestCache } from 'react';
import { isMissingStatus, RelistenApiError } from '@/api/fetcher';

// Every cached API read is a resource: one place sets its cache key, freshness,
// and how a missing thing behaves. `slim` is required, so nothing reaches the
// cache without being cut down to what the app reads (the cache's memory is
// bounded by bytes; see timber.cache.ts).

type Key = string | number;

type ResourceDef<A extends Key[], Raw, T> = {
  /** Cache key prefix; keep stable, it's the entry's identity. */
  name: string;
  /** Seconds before an entry is refreshed (it's served stale meanwhile). */
  ttl: number;
  load: (...args: A) => Promise<Raw>;
  /** API response → the smallest value the app needs. */
  slim: (raw: Raw, ...args: A) => T | Promise<T>;
};

export type Resource<A extends Key[], T> = {
  /** The cached value. A missing resource throws RelistenApiError. */
  get: (...args: A) => Promise<T>;
  /** The same, with a missing resource as a real 404 (for pages). */
  orDeny: (...args: A) => Promise<T>;
};

export function defineResource<A extends Key[], Raw, T>(
  def: ResourceDef<A, Raw, T>
): Resource<A, T> {
  const cached = timberCache.data(
    async (...args: A) => def.slim(await def.load(...args), ...args),
    {
      ttl: def.ttl,
      // Explicit: timber can't derive a stable identity for calls made through this helper.
      key: (...args: A) => `v4:${def.name}:${args.join(':')}`,
      staleWhileRevalidate: true,
    }
  );
  // React's cache dedupes within one render on top of the cross-request cache.
  const get = requestCache((...args: A) => cached(...args));
  return { get, orDeny: (...args: A) => denyIfMissing(get(...args)) };
}

/** A missing resource (404/410/422) becomes a real 404; anything else (API down) propagates. */
export async function denyIfMissing<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (isMissing(err)) deny(404);
    throw err;
  }
}

export const isMissing = (err: unknown) =>
  err instanceof RelistenApiError && isMissingStatus(err.status);

/**
 * Orval's generated client interpolates path params as-is. Ids come from the
 * API itself, but dates and slugs can come from the URL's query string, so
 * encode those: a crafted value must not change which API path is called.
 */
export const pathParam = (value: string) => encodeURIComponent(value);

export const MINUTES = 60;
