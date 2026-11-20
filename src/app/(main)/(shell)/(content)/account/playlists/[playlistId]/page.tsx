import { getSegmentParams } from '@timber-js/app/server';
import OwnPlaylist, { ownPlaylistMetadata } from '@/features/playlist/OwnPlaylist';
import { SEGMENT_PATH } from './$segment';

/** One of the signed-in listener's playlists. */
export default function Page() {
  const { playlistId } = getSegmentParams(SEGMENT_PATH);
  return <OwnPlaylist playlistId={playlistId} />;
}

export const metadata = () => ownPlaylistMetadata(getSegmentParams(SEGMENT_PATH));
