'use client';

import { createContext, use, useMemo } from 'react';
import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';

// The primary artists, for everything under the nav: the artist picker on
// every page, and the browse view's artists column. Sent once with the layout
// rather than to each, so a browse page carries the list once.

const PrimaryArtistsContext = createContext<ArtistListItem[] | null>(null);

export function PrimaryArtistsProvider({
  rows,
  children,
}: {
  rows: ArtistRow[];
  children: React.ReactNode;
}) {
  const artists = useMemo(() => rows.map(fromArtistRow), [rows]);
  return <PrimaryArtistsContext value={artists}>{children}</PrimaryArtistsContext>;
}

/** The primary artists, in the server's order. */
export function usePrimaryArtists(): ArtistListItem[] {
  const artists = use(PrimaryArtistsContext);
  if (!artists) throw new Error('usePrimaryArtists needs a <PrimaryArtists> above it');
  return artists;
}
