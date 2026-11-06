import 'server-only';

import { cache } from 'react';
import { getArtistDirectory } from '@/data/artists';
import { songDetail } from '@/data/songs';
import { songRows } from '@/ui/show-table/showRows';

/** A song's page: its details, and a table row per time it was played. */
export const loadSong = cache(async (artistSlug: string, songSlug: string) => {
  const [song, directory] = await Promise.all([
    songDetail(artistSlug, songSlug),
    getArtistDirectory(),
  ]);
  const rows = songRows(song, directory.byId);
  return {
    ...song,
    /** Times played: one row each. */
    performances: rows.length,
    /** Distinct shows; fewer than performances when a song repeats within a show. */
    shows: new Set(rows.map((r) => r.showId)).size,
    rows,
  };
});
