import { API_DOMAIN } from './constants';
import { PlayAppType } from './v4/generated/model';

/** Records a play of a v4 track id (`track_…`). Fire and forget. */
export function scrobblePlay(trackId: string): void {
  fetch(`${API_DOMAIN}/api/v4/live/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_id: trackId, app_type: PlayAppType.web }),
    keepalive: true,
  }).catch(() => {});
}
