import SongDetail, { songDetailMetadata } from '@/features/song-detail/SongDetail';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug, songSlug } = getSegmentParams(SEGMENT_PATH);
  return <SongDetail artistSlug={artistSlug} songSlug={songSlug} />;
}

export const metadata = () => songDetailMetadata(getSegmentParams(SEGMENT_PATH));
