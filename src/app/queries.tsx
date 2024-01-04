import { sortSources } from '@/redux/modules/tapes';
import { Artist, Tape } from '@/types';
import ky from 'ky-universal';
import { API_DOMAIN } from '../lib/constants';

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

export const fetchShow = async (
  slug?: string,
  year?: string,
  displayDate?: string
): Promise<Partial<Tape>> => {
  if (!slug || !year || !displayDate) return { sources: [] };

  const parsed = (await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years/${year}/${displayDate}`, {
    cache: 'no-cache',
  }).json()) as Tape;

  parsed.sources = sortSources(parsed.sources);

  return parsed;
};
