import 'server-only';

import { cache } from 'react';
import { href } from '@timber-js/app/routes';
import { deny } from '@timber-js/app/server';
import { artistIdForSlug, getArtistDirectory } from '@/data/artists';
import { showByDate } from '@/data/shows';
import type { Source } from '@/domain/types';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { sortSources } from '@/lib/sortSources';
import { splitShowDate } from '@/lib/utils';
import { showRow, type ShowRow } from '@/ui/shows/rows';
import type { ShowTrackRow } from './spec';

/** A show's page: the show, its row, and its tapes in display order. 404s for an unknown show. */
export const loadShowDetail = cache(async (artistSlug: string, date: string) => {
  const [show, directory] = await Promise.all([
    showByDate.orDeny(await artistIdForSlug(artistSlug), date),
    getArtistDirectory(),
  ]);
  const row = showRow(show, directory.byId);
  if (!row) deny(404);
  return { show, row, sources: sortSources(show.sources) };
});

/** A tape's tracks as rows, in play order. Each links to its track (or show) page on the browse view. */
export const trackRows = (show: ShowRow, source: Source): ShowTrackRow[] => {
  const { year, month, day } = splitShowDate(show.date);
  return source.sets.flatMap((set) =>
    set.tracks.map((track) => ({
      ...show,
      id: track.id,
      href: track.slug
        ? href(
            '/[artistSlug]/[year]/[month]/[day]/[songSlug]',
            { artistSlug: show.artistSlug, year, month, day, songSlug: track.slug },
            sourceQuery(source.id)
          )
        : href(
            '/[artistSlug]/[year]/[month]/[day]',
            { artistSlug: show.artistSlug, year, month, day },
            sourceQuery(source.id)
          ),
      track,
      trackTitle: track.title,
      songDuration: track.duration ?? null,
      position: track.position,
      songs: track.songs ?? [],
    }))
  );
};
