import { href } from '@timber-js/app/routes';
import { dateSearchParams } from './searchParams/dateSearchParam';
import { tableSearchParams } from '@/ui/table/params';
import { sourceQuery } from './searchParams/sourceSearchParam';

/** The overview's show table, best rated first. */
const TOP_SHOWS = tableSearchParams([]).buildSearchParams({ sort: '-rating' });

/** A month and day query, only when both are a real calendar date; else none (today). */
function calendarDate(month: string | null | undefined, day: string | null | undefined) {
  const m = Number(month);
  const d = Number(day);
  const valid =
    Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(d) && d >= 1 && d <= 31;
  return valid ? dateSearchParams.buildSearchParams({ month: m, day: d }) : undefined;
}

// Pure, so it can be tested apart from the browse middleware that uses it.

/**
 * Where an old browse section URL lives now, or null if it isn't one:
 *   /gd/top → /artists/gd?sort=-rating              /gd/songs → /artists/gd/songs
 *   /gd/songs?slug=x → the song page       /gd/today-in-history/5/8 → ?month=5&day=8
 *   /gd/songs?slug=x&date=1977-05-08[&track=t] → that show (on that track)
 */
export function movedQuickHitUrl(artist: string, segments: string[], query: URLSearchParams) {
  const section = segments[1];
  // Query values are untrusted; href() encodes each one as a single segment,
  // so a value can't add path segments or query params to the redirect target.
  const slug = query.get('slug') || undefined;
  const date = query.get('date');
  const track = query.get('track') || undefined;

  switch (section) {
    case 'top':
      return href('/artists/[artistSlug]', { artistSlug: artist }, TOP_SHOWS);
    case 'recently-added':
      return href('/artists/[artistSlug]/recently-added', { artistSlug: artist });
    case 'today-in-history':
      return href(
        '/artists/[artistSlug]/today-in-history',
        { artistSlug: artist },
        calendarDate(segments[2] ?? query.get('month'), segments[3] ?? query.get('day'))
      );
    case 'songs':
    case 'venues':
    case 'tours': {
      // A show was open in the section: go to the show itself.
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        const source = sourceQuery(query.get('source'));
        return track
          ? href(
              '/[artistSlug]/[year]/[month]/[day]/[songSlug]',
              { artistSlug: artist, year, month, day, songSlug: track },
              source
            )
          : href(
              '/[artistSlug]/[year]/[month]/[day]',
              { artistSlug: artist, year, month, day },
              source
            );
      }
      if (section === 'songs')
        return slug
          ? href('/artists/[artistSlug]/songs/[songSlug]', { artistSlug: artist, songSlug: slug })
          : href('/artists/[artistSlug]/songs', { artistSlug: artist });
      if (section === 'venues')
        return slug
          ? href('/artists/[artistSlug]/venues/[venueSlug]', {
              artistSlug: artist,
              venueSlug: slug,
            })
          : href('/artists/[artistSlug]/venues', { artistSlug: artist });
      return slug
        ? href('/artists/[artistSlug]/tours/[tourSlug]', { artistSlug: artist, tourSlug: slug })
        : href('/artists/[artistSlug]/tours', { artistSlug: artist });
    }
    default:
      return null;
  }
}
