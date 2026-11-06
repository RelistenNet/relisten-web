import TodayInHistory, { todayInHistoryMetadata } from '@/features/artist/TodayInHistory';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <TodayInHistory artistSlug={artistSlug} />;
}

export const metadata = () => todayInHistoryMetadata(getSegmentParams(SEGMENT_PATH));
