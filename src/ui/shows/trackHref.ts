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
 * Which route `pathname` shows this show in: the show or one of its tracks,
 * on the site or in an embed. There, playing a track changes only the URL (it
 * follows playback); on any other page (an artist's page, an admin tool that
 * takes the same params) it's undefined, and a track's link goes to the show.
 *
 * `showDate` is "YYYY-MM-DD". The URL's date is compared after padding, so an
 * unpadded URL (`/goose/2024/2/8`, which the routes accept) is the same show.
 */
export function showPageRoute(
  pathname: string,
  artistSlug: string,
  showDate: string
): TrackRoute | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const route: TrackRoute =
    segments[0] === 'embed' || segments[0] === 'embed-track' ? segments[0] : 'site';
  const [slug, year, month, day] = route === 'site' ? segments : segments.slice(1);
  if (slug !== artistSlug || !day) return undefined;
  return createShowDate(year, month, day) === showDate ? route : undefined;
}
