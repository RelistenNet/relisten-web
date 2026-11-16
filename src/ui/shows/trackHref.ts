import { href } from '@timber-js/app/routes';
import { createShowDate } from '@/lib/utils';

/** Where a track page lives: the site, or one of the two embeds. */
export type TrackRoute = 'site' | 'embed' | 'embed-track';

type TrackParams = {
  artistSlug: string;
  year: string;
  month: string;
  day: string;
  songSlug: string;
};

/** A track's page in `route`, with an optional query (`sourceQuery(…)`). */
export function trackHref(route: TrackRoute, params: TrackParams, query?: string) {
  switch (route) {
    case 'embed':
      return href('/embed/[artistSlug]/[year]/[month]/[day]/[songSlug]', params, query);
    case 'embed-track':
      return href('/embed-track/[artistSlug]/[year]/[month]/[day]/[songSlug]', params, query);
    default:
      return href('/[artistSlug]/[year]/[month]/[day]/[songSlug]', params, query);
  }
}

/**
 * Which of this show's pages `pathname` is: the show itself, one of its
 * tracks, or neither (null). Site and embed pages alike. On the show's pages,
 * playing a track changes only the URL (it follows playback); anywhere else,
 * its link goes to the show.
 *
 * `showDate` is "YYYY-MM-DD". The URL's date is compared after padding, so an
 * unpadded URL (`/goose/2024/2/8`, which the routes accept) is the same show.
 */
export function showPageKind(
  pathname: string,
  artistSlug: string,
  showDate: string
): 'show' | 'track' | null {
  const segments = pathname.split('/').filter(Boolean);
  const at = segments.indexOf(artistSlug);
  if (at === -1 || segments.length - at < 4) return null;
  const [year, month, day, track] = segments.slice(at + 1, at + 5);
  if (createShowDate(year, month, day) !== showDate) return null;
  return track ? 'track' : 'show';
}
