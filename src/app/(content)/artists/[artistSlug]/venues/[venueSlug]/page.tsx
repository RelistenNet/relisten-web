import VenueDetail, { venueMetadata } from '@/features/venue-detail/VenueDetail';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

/** One artist's shows at a venue. */
export default async function ArtistVenuePage() {
  const { venueSlug, artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <VenueDetail venueSlug={venueSlug} artistSlug={artistSlug} />;
}

export const metadata = async () => {
  const { venueSlug, artistSlug } = getSegmentParams(SEGMENT_PATH);
  return venueMetadata(venueSlug, artistSlug);
};
