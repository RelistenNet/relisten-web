// Detail page URLs. Things an artist owns live under /artists/{artist}/…;
// global things (venues) are top-level. The browse view keeps /{artist}/….

/** An artist's page, and its indexes. */
export const artistUrl = (artistSlug: string) => `/artists/${artistSlug}`;
export const artistSongsUrl = (artistSlug: string) => `/artists/${artistSlug}/songs`;
export const artistVenuesUrl = (artistSlug: string) => `/artists/${artistSlug}/venues`;

/** Top shows: the overview's show table, best rated first. */
export const artistTopShowsUrl = (artistSlug: string) => `/artists/${artistSlug}?sort=-rating`;
export const artistRecentlyAddedUrl = (artistSlug: string) =>
  `/artists/${artistSlug}/recently-added`;
export const artistToursUrl = (artistSlug: string) => `/artists/${artistSlug}/tours`;
export const tourUrl = (artistSlug: string, tourSlug: string) =>
  `/artists/${artistSlug}/tours/${tourSlug}`;
/** Shows on a calendar date in past years; today (in the viewer's timezone) by default. */
export const artistTodayUrl = (
  artistSlug: string,
  month?: number | string,
  day?: number | string
) => `/artists/${artistSlug}/today-in-history${month && day ? `?month=${month}&day=${day}` : ''}`;

/** A song's page (songs belong to an artist). */
export const songUrl = (artistSlug: string, songSlug: string) =>
  `/artists/${artistSlug}/songs/${songSlug}`;

/** Every venue, across all artists. */
export const venuesUrl = '/venues';

/** A venue's page: all artists, or one artist's shows there. */
export const venueUrl = (venueSlug: string, artistSlug?: string) =>
  artistSlug ? `/artists/${artistSlug}/venues/${venueSlug}` : `/venues/${venueSlug}`;
