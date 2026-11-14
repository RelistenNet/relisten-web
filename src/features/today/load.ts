import 'server-only';

import { cache } from 'react';
import { getArtistDirectory } from '@/data/artists';
import { onDate } from '@/data/shows';
import type { TodayShow } from './TodayTrack';

export type { TodayShow };

/** Every artist's shows on a calendar date, each joined with its artist (the Today page). */
export const loadTodayShows = cache(async (month: number, day: number): Promise<TodayShow[]> => {
  const [list, directory] = await Promise.all([onDate.orDeny(month, day), getArtistDirectory()]);
  return list.map((s) => {
    const artist = directory.byId.get(s.artistId);
    return { ...s, artist: artist && { name: artist.name, slug: artist.slug } };
  });
});
