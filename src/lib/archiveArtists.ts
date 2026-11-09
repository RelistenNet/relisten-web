import { fuzzyMatch, type FuzzyResult } from '@nozbe/microfuzz';
import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';

let request: Promise<ArtistListItem[] | null> | undefined;

/**
 * The archive list, `null` if it failed to load. Fetches on the first call and
 * returns that same promise afterwards, to every caller: the browse view's
 * artists column and the nav's artist picker share one request, and a
 * component that suspends on it can remount without starting another.
 * Browser only (a relative URL); read it with `use()` after `use(browser())`.
 * Resolves to `null` on failure instead of rejecting, since `use()` would
 * throw a rejection to the error boundary.
 */
export function loadArchive(): Promise<ArtistListItem[] | null> {
  return (request ??= fetch('/api/artists/archive')
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
