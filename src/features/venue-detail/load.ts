import 'server-only';

import { deny } from '@timber-js/app/server';
import { cache } from 'react';
import { getArtistDirectory } from '@/data/artists';
import { venueDetail } from '@/data/venues';
import { showRows } from '@/ui/shows/rows';

/** A venue's page: its details, and a table row per show there (all artists). */
export const loadVenue = cache(async (venue: string) => {
  const [detail, directory] = await Promise.all([venueDetail(venue), getArtistDirectory()]);
  const rows = showRows(detail.shows, directory.byId);
  return {
    id: detail.id,
    name: detail.name,
    location: detail.location,
    otherNames: detail.otherNames,
    artistCount: new Set(rows.map((r) => r.artistSlug)).size,
    rows,
  };
});

/**
 * A venue's page for all artists, or narrowed to one (/artists/{a}/venues/{v}):
 * the same cached venue, with its rows filtered. 404s for an artist who never
 * played there.
 */
export const loadScopedVenue = cache(async (venueSlug: string, artistSlug?: string) => {
  const venue = await loadVenue(venueSlug);
  const rows = artistSlug ? venue.rows.filter((r) => r.artistSlug === artistSlug) : venue.rows;
  if (artistSlug && rows.length === 0) deny(404);
  return { venue, rows, artistName: rows[0]?.artistName };
});
