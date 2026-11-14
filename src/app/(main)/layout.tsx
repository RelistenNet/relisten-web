import { getSegmentParams, type LayoutOptions } from '@timber-js/app/server';
import { ReactNode } from 'react';
import { findArtistBySlug } from '@/data/artists';
import { BrowsingArtistProvider } from '@/shell/browsingArtistContext';

// The artist the URL names, for the nav: its row (archive artists included,
// from the cached artist directory), or null where the URL names none or no
// artist. Keyed on that param alone, so it renders again only when the artist
// appears, changes or goes away, and then sends one row. The nav itself is
// (shell)/layout.tsx, below, rendered once per document.
export const layoutOptions = {
  key: { segmentParams: ['artistSlug'], headers: [] },
} satisfies LayoutOptions;

export default async function ArtistSeedLayout({ children }: { children: ReactNode }) {
  const { artistSlug } = getSegmentParams() as { artistSlug?: string };
  const artist = await findArtistBySlug(artistSlug);
  // Only the features the tabs read (artistSections).
  const seed = artist && {
    slug: artist.slug,
    name: artist.name,
    features: {
      normalization: artist.features?.normalization,
      perShowVenues: artist.features?.perShowVenues,
      perSourceVenues: artist.features?.perSourceVenues,
      tours: artist.features?.tours,
    },
  };
  return <BrowsingArtistProvider seed={seed ?? null}>{children}</BrowsingArtistProvider>;
}
