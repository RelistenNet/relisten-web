import { deny, getSegmentParams } from '@timber-js/app/server';
import { isPlaylistId } from '@/domain/playlists';
import EditPlaylist, { editPlaylistMetadata } from '@/features/playlist/EditPlaylist';
import { SEGMENT_PATH } from './$segment';

/** Editing one of the signed-in listener's playlists. */
export default function Page() {
  const { playlist: playlistId } = getSegmentParams(SEGMENT_PATH);
  // The creator's own, by id: a share code here is a 404.
  if (!isPlaylistId(playlistId)) deny(404);
  return <EditPlaylist playlistId={playlistId} />;
}

export const metadata = () =>
  editPlaylistMetadata({ playlistId: getSegmentParams(SEGMENT_PATH).playlist });
