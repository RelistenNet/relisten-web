import { href } from '@timber-js/app/routes';

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
 * Whether `pathname` is one of this show's pages: the show, or one of its
 * tracks, on the site or in an embed. There, playing a track changes only
 * the URL (it follows playback); anywhere else, its link goes to the show.
 */
export const isShowPage = (
  pathname: string,
  { artistSlug, year, month, day }: Omit<TrackParams, 'songSlug'>
) => `${pathname}/`.includes(`/${artistSlug}/${year}/${month}/${day}/`);
