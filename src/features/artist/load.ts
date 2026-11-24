import 'server-only';

import { cache } from 'react';
import { artistIdForSlug, getArtistDirectory } from '@/data/artists';
import { artistOnDate, artistShows, recentlyAdded } from '@/data/shows';
import type { ShowSummary } from '@/domain/types';
import { showRows } from '@/ui/shows/rows';

// Data for the artist pages: cached domain data from src/data, turned into
// table rows per request.

const rows = async (shows: Promise<ShowSummary[]>) => {
  const [list, directory] = await Promise.all([shows, getArtistDirectory()]);
  return showRows(list, directory.byId);
};

/** Every show the artist played (the overview's table). */
export const loadArtistShows = cache(async (artistSlug: string) =>
  rows(artistShows.orDeny(await artistIdForSlug(artistSlug)))
);

export const loadRecentlyAdded = cache(async (artistSlug: string) =>
  rows(recentlyAdded.orDeny(await artistIdForSlug(artistSlug)))
);

/** The artist's shows on a calendar date across the years. */
export const loadOnDate = cache(async (artistSlug: string, month: number, day: number) =>
  rows(artistOnDate.orDeny(await artistIdForSlug(artistSlug), month, day))
);
