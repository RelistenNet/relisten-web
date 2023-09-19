import ky from 'ky-universal';
import { API_DOMAIN } from '../lib/constants';
import { Artist } from '@/types';

export const fetchArtists = async (): Promise<Artist[]> => {
  const parsed = await ky(`${API_DOMAIN}/api/v2/artists`, {
    next: { revalidate: 60 * 5 }, // leaving for now, should revisit cache (I dont think this works)
  })
    .json()
    .catch((err) => {
      console.error('artists fetch error', err);
    });

  return (parsed as Artist[]) ?? [];
};
