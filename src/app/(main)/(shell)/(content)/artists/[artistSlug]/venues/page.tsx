import VenuesIndex, { venuesIndexMetadata } from '@/features/venues-index/VenuesIndex';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <VenuesIndex artistSlug={artistSlug} />;
}

export const metadata = () => venuesIndexMetadata(getSegmentParams(SEGMENT_PATH));
