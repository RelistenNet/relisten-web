// Detail page URLs. Things an artist owns live under /artists/{artist}/…;
// global things (venues) are top-level. The browse view keeps /{artist}/….

/** An artist's page, and its indexes. */
export const artistUrl = (artistSlug: string) => `/artists/${artistSlug}`;
export const artistSongsUrl = (artistSlug: string) => `/artists/${artistSlug}/songs`;
export const artistVenuesUrl = (artistSlug: string) => `/artists/${artistSlug}/venues`;

/** A song's page (songs belong to an artist). */
export const songUrl = (artistSlug: string, songSlug: string) =>
  `/artists/${artistSlug}/songs/${songSlug}`;

/** A venue's page: all artists, or one artist's shows there. */
export const venueUrl = (venueSlug: string, artistSlug?: string) =>
  artistSlug ? `/artists/${artistSlug}/venues/${venueSlug}` : `/venues/${venueSlug}`;
