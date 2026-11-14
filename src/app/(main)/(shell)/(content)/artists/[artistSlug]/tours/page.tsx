import Tours, { toursMetadata } from '@/features/artist/Tours';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <Tours artistSlug={artistSlug} />;
}

export const metadata = () => toursMetadata(getSegmentParams(SEGMENT_PATH));
