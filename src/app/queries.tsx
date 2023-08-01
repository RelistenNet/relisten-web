import ky from 'ky';
import { API_DOMAIN } from '../lib/constants';
import { Artist } from '@/types';

export const fetchArtists = async (): Promise<Artist[]> => {
  const parsed = await ky(`${API_DOMAIN}/api/v2/artists`).json();

  return parsed;
};
