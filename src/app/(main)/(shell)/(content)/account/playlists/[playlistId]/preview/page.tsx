import { getSegmentParams } from '@timber-js/app/server';
import PreviewPlaylist, { previewPlaylistMetadata } from '@/features/playlist/PreviewPlaylist';
import { SEGMENT_PATH } from './$segment';

/** One of the signed-in listener's playlists, as readers would see it published. */
export default function Page() {
  const { playlistId } = getSegmentParams(SEGMENT_PATH);
  return <PreviewPlaylist playlistId={playlistId} />;
}

export const metadata = () => previewPlaylistMetadata(getSegmentParams(SEGMENT_PATH));
