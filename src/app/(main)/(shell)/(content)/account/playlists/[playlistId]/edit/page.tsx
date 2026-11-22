import { getSegmentParams } from '@timber-js/app/server';
import EditPlaylist, { editPlaylistMetadata } from '@/features/playlist/EditPlaylist';
import { SEGMENT_PATH } from './$segment';

/** Editing one of the signed-in listener's playlists. */
export default function Page() {
  const { playlistId } = getSegmentParams(SEGMENT_PATH);
  return <EditPlaylist playlistId={playlistId} />;
}

export const metadata = () => editPlaylistMetadata(getSegmentParams(SEGMENT_PATH));
