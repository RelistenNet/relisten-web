import VenuesIndex, { venuesIndexMetadata } from '@/features/venues-index/VenuesIndex';
import { getSegmentParams } from '@timber-js/app/server';
import { requireArtistSection } from '@/lib/requireArtistSection';
import { SEGMENT_PATH } from './$segment';

export default async function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  await requireArtistSection(artistSlug, 'venues');
  return <VenuesIndex artistSlug={artistSlug} />;
}

export const metadata = () => venuesIndexMetadata(getSegmentParams(SEGMENT_PATH));
