import ky from 'ky';
import { API_DOMAIN } from '../lib/constants';

export const fetchArtists = async () => {
  const parsed = await ky(`${API_DOMAIN}/api/v2/artists`).json();

  return parsed;
};
