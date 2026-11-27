import { getSegmentParams } from '@timber-js/app/server';
import { isPlaylistId } from '@/domain/playlists';
import { PLAYLIST_CARD_SIZE, playlistCard } from '@/features/playlist/PlaylistCard';
import { SEGMENT_PATH } from './$segment';

export const alt = 'A Relisten playlist';
export const size = PLAYLIST_CARD_SIZE;
export const contentType = 'image/png';

/** A published playlist's link preview. A creator's own URL (by id) has none. */
export default function OGImage() {
  const { playlist } = getSegmentParams(SEGMENT_PATH);
  if (isPlaylistId(playlist)) return new Response('Not found', { status: 404 });
  return playlistCard(playlist);
}
