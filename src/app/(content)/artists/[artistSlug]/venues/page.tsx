import VenuesIndex, { venuesIndexMetadata } from '@/features/venues-index/VenuesIndex';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { href } from '@timber-js/app/routes';
import { findArtistBySlug } from '@/data/artists';
import { artistSections } from '@/lib/artistSections';
import { SEGMENT_PATH } from './$segment';

export default async function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  // Switching artists keeps the section; an artist without this one gets its overview.
  const artist = await findArtistBySlug(artistSlug);
  if (artist && !artistSections(artist.features).venues) {
    redirect(href('/artists/[artistSlug]', { artistSlug }));
  }
  return <VenuesIndex artistSlug={artistSlug} />;
}

export const metadata = () => venuesIndexMetadata(getSegmentParams(SEGMENT_PATH));
