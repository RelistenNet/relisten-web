import 'server-only';

import type { ShowSummaryResource } from '@/api/generated/model';
import type { ShowSummary } from '@/domain/types';
import { showVenue } from './adapters';

/** An API show → the slim summary lists and tables use. */
export function toShowSummary(s: ShowSummaryResource): ShowSummary | null {
  if (!s.display_date) return null;
  const venue = showVenue(s);
  return {
    id: s.id,
    artistId: s.artist_id,
    date: s.display_date,
    venue: venue ? { name: venue.name, location: venue.location, slug: venue.slug } : undefined,
    tourName: s.tour?.name && s.tour.name !== 'Not Part of a Tour' ? s.tour.name : undefined,
    tapes: s.source_count,
    sbd: s.has_soundboard_source,
    rating: s.avg_rating > 0 ? s.avg_rating : null,
    plays30d: s.popularity?.windows?.['30d']?.plays ?? 0,
    addedAt: s.created_at,
  };
}

export const toShowSummaries = (shows: ShowSummaryResource[] | null | undefined) =>
  (shows ?? []).flatMap((s) => toShowSummary(s) ?? []);
