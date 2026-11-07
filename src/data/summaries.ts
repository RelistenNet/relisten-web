import 'server-only';

import type { ShowResource, ShowSummaryResource } from '@/api/generated/model';
import type { ShowDetail, ShowSummary } from '@/domain/types';
import { sortSources, sortTracksInSources } from '@/lib/sortSources';
import { showVenue, toPopularity, toSource } from './adapters';

const summaryOf = (s: ShowSummaryResource, date: string): ShowSummary => ({
  id: s.id,
  artistId: s.artist_id,
  date,
  venue: showVenue(s),
  tourName: s.tour?.name && s.tour.name !== 'Not Part of a Tour' ? s.tour.name : undefined,
  tapes: s.source_count,
  sbd: s.has_soundboard_source,
  rating: s.avg_rating > 0 ? s.avg_rating : null,
  plays30d: s.popularity?.windows?.['30d']?.plays ?? 0,
  addedAt: s.created_at,
});

/** An API show → the slim summary lists and tables use. */
export function toShowSummary(s: ShowSummaryResource): ShowSummary | null {
  if (!s.display_date) return null;
  return summaryOf(s, s.display_date);
}

export const toShowSummaries = (shows: ShowSummaryResource[] | null | undefined) =>
  (shows ?? []).flatMap((s) => toShowSummary(s) ?? []);

/** The browse view's shows column also shows each show's length and popularity badge. */
export const toBrowseShowSummaries = (shows: ShowSummaryResource[] | null | undefined) =>
  (shows ?? []).flatMap((s): ShowSummary[] => {
    const summary = toShowSummary(s);
    return summary
      ? [{ ...summary, avgDuration: s.avg_duration, popularity: toPopularity(s.popularity) }]
      : [];
  });

/**
 * A full show for show pages: tapes in display order, tracks in play order.
 * (Cached values are shared, so this sorts before caching.)
 */
export function toShowDetail(s: ShowResource): ShowDetail {
  const sources = sortSources((s.sources ?? []).map(toSource));
  sortTracksInSources(sources);
  return { ...summaryOf(s, s.display_date ?? ''), sources };
}
