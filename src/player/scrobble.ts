import { isPlaylistId } from '@/domain/playlists';
import { API_DOMAIN } from '@/lib/constants';

/**
 * Records a play of a v4 track id (`track_…`). Fire and forget. `playlistId`
 * credits the play to the public playlist it was started from; anything but a
 * canonical `playlist_…` id would get the whole play refused, so it's dropped.
 */
export function scrobblePlay(trackId: string, playlistId?: string): void {
  fetch(`${API_DOMAIN}/api/v4/live/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track_id: trackId,
      app_type: 'web',
      ...(isPlaylistId(playlistId) ? { playlist_id: playlistId } : {}),
    }),
    keepalive: true,
  }).catch(() => {});
}
