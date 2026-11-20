import { getSegmentParams } from '@timber-js/app/server';
import { PLAYLIST_CARD_SIZE, playlistCard } from '@/features/playlist/PlaylistCard';
import { SEGMENT_PATH } from './$segment';

export const alt = 'A Relisten playlist';
export const size = PLAYLIST_CARD_SIZE;
export const contentType = 'image/png';

/** A published playlist's link preview. */
export default function OGImage() {
  const { publicCode } = getSegmentParams(SEGMENT_PATH);
  return playlistCard(publicCode);
}
