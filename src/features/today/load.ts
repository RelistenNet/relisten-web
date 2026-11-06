import 'server-only';

import { cache } from 'react';
import { getArtistDirectory } from '@/data/artists';
import { onDate } from '@/data/shows';
import type { Day } from '@/types';

/** Every artist's shows on a calendar date, each joined with its artist (the Today page). */
export const loadTodayShows = cache(async (month: number, day: number): Promise<Day[]> => {
  const [list, directory] = await Promise.all([onDate.orDeny(month, day), getArtistDirectory()]);
  return list.map((s) => ({
    id: s.id,
    artist: directory.byId.get(s.artistId),
    artist_id: s.artistId,
    venue: s.venue ? { id: s.id, ...s.venue } : undefined,
    display_date: s.date,
    source_count: s.tapes,
    has_soundboard_source: s.sbd,
  }));
});
