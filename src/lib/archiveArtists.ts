import { fuzzyMatch, type FuzzyResult } from '@nozbe/microfuzz';
import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';

/** Returns the archive list (`null` if it failed to load); the same promise on every call. */
export type ArchiveLoader = () => Promise<ArtistListItem[] | null>;

/**
 * A loader for the archive list: fetches on the first call and returns that
 * same request afterwards. Resolves to `null` on failure instead of
 * rejecting, since `use()` would throw a rejection to the error boundary.
 */
export function createArchiveLoader(): ArchiveLoader {
  let request: Promise<ArtistListItem[] | null> | undefined;
  return () =>
    (request ??= fetch('/api/artists/archive')
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
