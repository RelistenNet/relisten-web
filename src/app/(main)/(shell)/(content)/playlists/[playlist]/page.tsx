import { getSegmentParams } from '@timber-js/app/server';
import PlaylistPage, { playlistPageMetadata } from '@/features/playlist/PlaylistPage';
import { SEGMENT_PATH } from './$segment';

/** A playlist: published, by its share code, or its creator's own, by its id. */
export default function Page() {
  const { playlist } = getSegmentParams(SEGMENT_PATH);
  return <PlaylistPage playlist={playlist} />;
}

export const metadata = () => playlistPageMetadata(getSegmentParams(SEGMENT_PATH));
