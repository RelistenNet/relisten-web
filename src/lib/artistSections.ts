import type { ArtistFeatures } from '@/domain/types';

/**
 * The artist sections that only some artists have. Songs come from
 * normalization; the older setlist songs flag can be set on artists with no
 * songs, so it doesn't count.
 */
export function artistSections(features?: Partial<ArtistFeatures>) {
  return {
    songs: !!features?.normalization,
    venues: !!(features?.perShowVenues || features?.perSourceVenues),
    tours: !!features?.tours,
  };
}
