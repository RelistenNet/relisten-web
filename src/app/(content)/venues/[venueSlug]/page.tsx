import VenueDetail, { venueMetadata } from '@/features/venue-detail/VenueDetail';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

/** A venue's shows across every artist. */
export default async function VenuePage() {
  const { venueSlug } = getSegmentParams(SEGMENT_PATH);
  return <VenueDetail venueSlug={venueSlug} />;
}

export const metadata = async () => {
  const { venueSlug } = getSegmentParams(SEGMENT_PATH);
  return venueMetadata(venueSlug);
};
