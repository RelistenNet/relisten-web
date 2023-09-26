import { API_DOMAIN } from '../lib/constants';
import { Artist } from '@/types';

export const fetchArtists = async (): Promise<Artist[]> => {
  try {
    const res = await fetch(`${API_DOMAIN}/api/v2/artists`);
    const parsed = await res.json();
    return parsed as Artist[];
  } catch (err) {
    console.error('artists fetch error', err);
    return [];
  }
};
