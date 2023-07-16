import { Artist } from '../types';
import { API_DOMAIN } from './constants';
import artistSlugs from './rawSlugs';

if (typeof window === 'undefined') {
  fetch(`${API_DOMAIN}/api/v2/artists`)
    .then((res) => res.json())
    .then((json) =>
      json.map((artist: Artist) => {
        if (artistSlugs.indexOf(artist.slug) === -1) {
          artistSlugs.push(artist.slug);
        }
      })
    );
}

export { artistSlugs };
