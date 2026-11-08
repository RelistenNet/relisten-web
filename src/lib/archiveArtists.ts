import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';

/**
 * A loader for the archive artists (~4k rows, from /api/artists/archive):
 * fetches on the first call and returns that same request afterwards.
 * Resolves to `null` on failure instead of rejecting, since `use()` would
 * throw a rejection to the error boundary.
 */
export function createArchiveLoader(): () => Promise<ArtistListItem[] | null> {
  let request: Promise<ArtistListItem[] | null> | undefined;
  return () =>
    (request ??= fetch('/api/artists/archive')
      .then((res) => (res.ok ? (res.json() as Promise<ArtistRow[]>) : null))
      .then((rows) => rows && rows.map(fromArtistRow))
      .catch(() => null));
}
