import { fuzzyMatch, type FuzzyResult } from '@nozbe/microfuzz';
import { href } from '@timber-js/app/routes';
import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';

/** Generous: the list is ~4k rows, and a cache miss rebuilds it on the server. */
const ARCHIVE_TIMEOUT_MS = 15_000;

let request: Promise<ArtistListItem[] | null> | undefined;

/**
 * The archive list, `null` if it failed to load. Fetches on the first call and
 * returns that same promise afterwards, to every caller: the browse view's
 * artists column and the nav's artist picker share one request, and a
 * component that suspends on it can remount without starting another.
 * Browser only (a relative URL); read it with `use()` after `use(browser())`.
 * Resolves to `null` on failure (or after ARCHIVE_TIMEOUT_MS) instead of
 * rejecting, since `use()` would throw a rejection to the error boundary.
 */
export function loadArchive(): Promise<ArtistListItem[] | null> {
  // A stalled request would leave "Searching…" up for good; past the timeout
  // it fails like any other error, and searches cover the primary artists.
  return (request ??= fetch(href('/api/artists/archive'), {
    signal: AbortSignal.timeout(ARCHIVE_TIMEOUT_MS),
  })
    .then((res) => (res.ok ? (res.json() as Promise<ArtistRow[]>) : null))
    .then((rows) => rows && rows.map(fromArtistRow))
    .catch(() => null));
}

/** Fuzzy matches by name across the lists (primary and archive), best first. */
export function searchArtists<T extends { name?: string | null }>(lists: T[][], query: string) {
  const matches: { artist: T; result: FuzzyResult<string> }[] = [];
  for (const list of lists) {
    for (const artist of list) {
      const result = fuzzyMatch(artist.name || '', query);
      if (result) matches.push({ artist, result });
    }
  }
  return matches.sort((a, b) => a.result.score - b.result.score);
}
