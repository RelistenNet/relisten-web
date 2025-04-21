import { API_DOMAIN } from '@/lib/constants';
import { Tape } from '@/types';
import ky from 'ky';

export const fetchRandomShow = async (slug?: string): Promise<Tape | undefined> => {
  if (!slug) return undefined;

  const parsed: Tape = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/shows/random`, {
    cache: 'no-cache',
  }).json();

  return parsed;
};
