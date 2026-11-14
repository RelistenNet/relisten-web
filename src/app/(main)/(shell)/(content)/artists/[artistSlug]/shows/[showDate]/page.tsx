import ShowDetail, { showDetailMetadata } from '@/features/show-detail/ShowDetail';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug, showDate } = getSegmentParams(SEGMENT_PATH);
  return <ShowDetail artistSlug={artistSlug} showDate={showDate} />;
}

export const metadata = () => showDetailMetadata(getSegmentParams(SEGMENT_PATH));
