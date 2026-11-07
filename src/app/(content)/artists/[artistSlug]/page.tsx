import ArtistOverview, { artistOverviewMetadata } from '@/features/artist/ArtistOverview';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <ArtistOverview artistSlug={artistSlug} />;
}

export const metadata = () => artistOverviewMetadata(getSegmentParams(SEGMENT_PATH));
