import { notFound } from 'next/navigation';

import ky from 'ky-universal';
import { Artist, Tape } from '@/types';
import { API_DOMAIN } from '../lib/constants';
import { sortSources } from '@/lib/sortSources';

export const fetchArtists = async (): Promise<Artist[]> => {
  const parsed = await ky(`${API_DOMAIN}/api/v2/artists`, {
    next: { revalidate: 60 * 5 }, // leaving for now, should revisit cache (I dont think this works)
  })
    .json()
    .catch((err) => {
      console.error('artists fetch error', err);

      notFound();
    });

  return (parsed as Artist[]) ?? [];
};

export const fetchShow = async (
  slug?: string,
  year?: string,
  displayDate?: string
): Promise<Partial<Tape> | undefined> => {
  if (!slug || !year || !displayDate) return { sources: [] };

  try {
    const parsed = (await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years/${year}/${displayDate}`, {
      cache: 'no-cache',
    }).json()) as Tape;

    if (parsed) {
      parsed.sources = sortSources(parsed.sources);

      return parsed;
    }
  } catch (err) {
    notFound();
  }
};

export const fetchShowByUUID = async (showUuid: string): Promise<Partial<Tape> | undefined> => {
  if (!showUuid) return { sources: [] };

  try {
    const parsed = (await ky(`${API_DOMAIN}/api/v3/shows/${showUuid}`, {
      cache: 'no-cache',
    }).json()) as Tape;

    if (parsed) {
      parsed.sources = sortSources(parsed.sources);

      return parsed;
    }
  } catch (err) {
    notFound();
  }
};
