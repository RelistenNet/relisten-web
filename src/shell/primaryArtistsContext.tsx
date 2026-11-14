'use client';

import { createContext, use, useState } from 'react';
import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';

// The primary artists, for everything that lists artists: the artist pickers
// and the browse view's artists column.

const PrimaryArtistsContext = createContext<ArtistListItem[] | null>(null);

export function PrimaryArtistsProvider({
  rows,
  children,
}: {
  /** Sent with the document only; absent in RSC payloads. */
  rows?: ArtistRow[];
  children: React.ReactNode;
}) {
  // In the root layout this mounts once per document, and only the document
  // sends rows (RSC payloads omit them): keep the first, ignore the rest.
  const [artists] = useState(() => {
    // Mounting from an RSC payload (no rows) means the document's rows are lost.
    if (!rows) throw new Error('PrimaryArtistsProvider mounted without rows');
    return rows.map(fromArtistRow);
  });

  return <PrimaryArtistsContext value={artists}>{children}</PrimaryArtistsContext>;
}

/** The primary artists, in the server's order. */
export function usePrimaryArtists(): ArtistListItem[] {
  const artists = use(PrimaryArtistsContext);
  if (!artists) throw new Error('usePrimaryArtists needs a <PrimaryArtists> above it');
  return artists;
}
