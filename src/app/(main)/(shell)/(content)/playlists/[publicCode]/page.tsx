import { getSegmentParams } from '@timber-js/app/server';
import PublicPlaylist, { publicPlaylistMetadata } from '@/features/playlist/PublicPlaylist';
import { SEGMENT_PATH } from './$segment';

/** A published playlist, by its share code. */
export default function Page() {
  const { publicCode } = getSegmentParams(SEGMENT_PATH);
  return <PublicPlaylist publicCode={publicCode} />;
}

export const metadata = () => publicPlaylistMetadata(getSegmentParams(SEGMENT_PATH));
