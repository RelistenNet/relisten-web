'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  MIN_QUERY_LENGTH,
  SEARCH_BUDGET_MS,
  UNAVAILABLE_SEARCH,
  type SearchResults,
  type SearchScope,
} from './search';
import { searchSearchParams } from './searchParams/apiSearchParams';

// A search box's request over /api/search: the nav bar's combobox (All) and the
// playlist editor's Add Tracks (tracks only). A read the user starts, so it
// follows review principle 16: the promise is made in a transition, held in
// state and read with `use()`; repeats are the browser's HTTP cache's.

const REQUEST_DEBOUNCE_MS = 180;
/** The server's whole budget, fallback included, plus a second for the trip. */
const FETCH_TIMEOUT_MS = SEARCH_BUDGET_MS + 1_000;

export type SearchRequest = { query: string; results: Promise<SearchResults> };

function fetchSearch(query: string, scope: SearchScope): Promise<SearchResults> {
  return fetch(searchSearchParams.href('/api/search', { q: query, scope }), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
    .then((res) => (res.ok ? (res.json() as Promise<SearchResults>) : UNAVAILABLE_SEARCH))
    .catch(() => UNAVAILABLE_SEARCH);
}

/** The query as it's searched (and as a request is keyed). */
export const normalizeQuery = (query: string) => query.trim().toLowerCase();

/**
 * The latest search request for `query`, started once typing pauses: every
 * change, a space too, restarts the wait. The request is made in a transition
 * and kept in state, so its promise is stable for `use()`, the previous
 * results stay on screen while it loads, and `isPending` says it's loading.
 * A newer request replaces an older one; one still in flight resolves into
 * nothing. Emptying the box drops the request. Unmounting cancels a request
 * that hasn't started.
 */
export function useSearchRequest(
  query: string,
  scope: SearchScope = 'all'
): { request: SearchRequest | null; isPending: boolean } {
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [isPending, startTransition] = useTransition();

  // A query too short to search has no request, so the next query starts
  // fresh ("Searching…") instead of showing whatever was searched before.
  if (request && normalizeQuery(query).length < MIN_QUERY_LENGTH) setRequest(null);

  useEffect(() => {
    const q = normalizeQuery(query);
    if (q.length < MIN_QUERY_LENGTH) return;
    const timer = setTimeout(() => {
      startTransition(() => setRequest({ query: q, results: fetchSearch(q, scope) }));
    }, REQUEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, scope]);

  return { request, isPending };
}
