import RecentlyAdded, { recentlyAddedMetadata } from '@/features/artist/RecentlyAdded';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <RecentlyAdded artistSlug={artistSlug} />;
}

export const metadata = () => recentlyAddedMetadata(getSegmentParams(SEGMENT_PATH));
