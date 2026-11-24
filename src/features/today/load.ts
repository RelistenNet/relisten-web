import 'server-only';

import { cache } from 'react';
import { getArtistDirectory } from '@/data/artists';
import { onDate } from '@/data/shows';
import type { Artist } from '@/domain/types';
import { showRows, type ShowRow } from '@/ui/shows/rows';

/** Primary artists first, then featured, then the archive. */
const rank = (a: Artist | undefined) => (a?.featured === 1 ? 0 : a?.featured === 0 ? 1 : 2);

/**
 * Every artist's shows on a calendar date, as show table rows: grouped by
 * artist (primary artists first, then by how many shows they have), each
 * artist's shows oldest first.
 */
export const loadTodayRows = cache(async (month: number, day: number): Promise<ShowRow[]> => {
  const [list, directory] = await Promise.all([onDate.orDeny(month, day), getArtistDirectory()]);
  const bySlug = new Map([...directory.byId.values()].map((a) => [a.slug, a]));
  return showRows(list, directory.byId).sort((x, y) => {
    if (x.artistSlug !== y.artistSlug) {
      const a = bySlug.get(x.artistSlug);
      const b = bySlug.get(y.artistSlug);
      return (
        rank(a) - rank(b) ||
        (b?.showCount ?? 0) - (a?.showCount ?? 0) ||
        x.artistName.localeCompare(y.artistName)
      );
    }
    return x.date.localeCompare(y.date);
  });
});
