import { API_DOMAIN } from './constants';

export function scrobblePlay(uuid: string): void {
  fetch(`${API_DOMAIN}/api/v2/live/play?track_uuid=${uuid}&app_type=web`, {
    method: 'post',
  }).catch(() => {});
}
