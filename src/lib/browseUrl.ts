import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { createShowDate, splitShowDate } from '@/lib/utils';

/** What a browse URL asks for, before anything is fetched. */
export type BrowseRequest =
  | { kind: 'invalid' }
  | { kind: 'artist'; artistSlug: string }
  | { kind: 'today-in-history'; artistSlug: string }
  | { kind: 'year'; artistSlug: string; year: string }
  | { kind: 'quick-hit'; artistSlug: string; segment: string; slug?: string }
  | {
      kind: 'show';
      artistSlug: string;
      segment?: string;
      slug?: string;
      date: { year: string; month: string; day: string; display: string };
      track?: string;
    };

export type BrowseUrlParams = {
  artistSlug: string;
  year?: string;
  month?: string;
  day?: string;
  songSlug?: string;
};

export type BrowseUrlSearch = { slug?: string; date?: string; track?: string };

const YEAR = /^\d{4}$/;
// `x` marks an unknown month/day (e.g. 1969-xx-xx), as in app/schema.ts.
const MONTH_OR_DAY = /^[\dx]{1,2}$/i;
const SHOW_DATE = /^\d{4}-[\dx]{2}-[\dx]{2}$/i;

function showDate(year: string, month: string, day: string) {
  if (!YEAR.test(year) || !MONTH_OR_DAY.test(month) || !MONTH_OR_DAY.test(day)) return null;
  return { year, month, day, display: createShowDate(year, month, day) };
}

/**
 * The browse URL grammar, in one place. Two URL shapes name a show:
 *
 *   /:artist/:year/:month/:day[/:track]                  canonical
 *   /:artist/:tab?slug=&date=YYYY-MM-DD[&track=]         quick-hit tab, keeps the tab's column stack
 *
 * Pure: no fetching, so the grammar is unit-tested without mocks.
 */
export function parseBrowseUrl(params: BrowseUrlParams, search: BrowseUrlSearch): BrowseRequest {
  const { artistSlug, year, month, day, songSlug } = params;

  if (!year) return { kind: 'artist', artistSlug };
  if (year === 'today-in-history') return { kind: 'today-in-history', artistSlug };

  if (isQuickHitSegment(year)) {
    const { slug, date, track } = search;
    if (!date)
      return track ? { kind: 'invalid' } : { kind: 'quick-hit', artistSlug, segment: year, slug };
    if (!SHOW_DATE.test(date)) return { kind: 'invalid' };
    const parts = splitShowDate(date);
    const parsed = showDate(parts.year, parts.month, parts.day);
    if (!parsed) return { kind: 'invalid' };
    return { kind: 'show', artistSlug, segment: year, slug, date: parsed, track };
  }

  if (!YEAR.test(year)) return { kind: 'invalid' };
  if (!month && !day) return { kind: 'year', artistSlug, year };
  if (!month || !day) return { kind: 'invalid' };

  const parsed = showDate(year, month, day);
  if (!parsed) return { kind: 'invalid' };
  return { kind: 'show', artistSlug, date: parsed, track: songSlug };
}
