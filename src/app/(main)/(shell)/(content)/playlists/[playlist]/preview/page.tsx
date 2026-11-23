import { deny, getSegmentParams } from '@timber-js/app/server';
import { isPlaylistId } from '@/domain/playlists';
import PreviewPlaylist, { previewPlaylistMetadata } from '@/features/playlist/PreviewPlaylist';
import { SEGMENT_PATH } from './$segment';

/** One of the signed-in listener's playlists, as readers would see it published. */
export default function Page() {
  const { playlist: playlistId } = getSegmentParams(SEGMENT_PATH);
  // The creator's own, by id: a share code here is a 404.
  if (!isPlaylistId(playlistId)) deny(404);
  return <PreviewPlaylist playlistId={playlistId} />;
}

export const metadata = () =>
  previewPlaylistMetadata({ playlistId: getSegmentParams(SEGMENT_PATH).playlist });
