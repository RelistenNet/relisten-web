import Tour, { tourMetadata } from '@/features/artist/Tour';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug, tourSlug } = getSegmentParams(SEGMENT_PATH);
  return <Tour artistSlug={artistSlug} tourSlug={tourSlug} />;
}

export const metadata = () => tourMetadata(getSegmentParams(SEGMENT_PATH));
