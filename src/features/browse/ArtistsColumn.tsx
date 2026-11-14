'use client';

import { href } from '@timber-js/app/routes';
import { useSegmentParams } from '@timber-js/app/client';
import type { ArtistListItem } from '@/lib/artistRows';
import ArtistsSelectionTab from './ArtistsSelectionTab';

// The browse view's artists column: each row opens the artist's browse view.
// The primary artists come from the layout's <PrimaryArtists>; the much longer
// archive list is fetched by the client from /api/artists/archive, so it isn't
// serialized into every page's RSC payload.

const browseHref = (artist: ArtistListItem) => href('/[artistSlug]', { artistSlug: artist.slug });

const ArtistsColumn = () => {
  const { artistSlug } = useSegmentParams('/(main)/(shell)/(browse)/[artistSlug]');
  return <ArtistsSelectionTab currentSlug={artistSlug} hrefFor={browseHref} />;
};

export default ArtistsColumn;
