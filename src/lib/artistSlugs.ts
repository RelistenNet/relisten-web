import { Artist } from '../types';
import { API_DOMAIN } from './constants';
import artistSlugs from './rawSlugs';

if (typeof window === 'undefined') {
  fetch(`${API_DOMAIN}/api/v2/artists`)
    .then((res) => res.json())
    .then((json) =>
      json.map((artist: Artist) => {
        if (artistSlugs.indexOf(String(artist?.slug)) === -1) {
          artistSlugs.push(String(artist?.slug));
        }
      })
    );
}

export default artistSlugs;
