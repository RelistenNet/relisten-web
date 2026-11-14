import { API_DOMAIN } from '@/lib/constants';

/** Records a play of a v4 track id (`track_…`). Fire and forget. */
export function scrobblePlay(trackId: string): void {
  fetch(`${API_DOMAIN}/api/v4/live/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_id: trackId, app_type: 'web' }),
    keepalive: true,
  }).catch(() => {});
}
