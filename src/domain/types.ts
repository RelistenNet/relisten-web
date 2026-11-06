// The app's own types for catalog data, independent of the API's shapes. Data
// loaders (src/data) produce these; views build on them. Generated API types
// stay inside src/data.
//
// The browse view still uses the older shapes in src/types.ts; it moves here
// over time.

/** A show as lists and tables need it. The artist's name and slug are joined per request. */
export type ShowSummary = {
  id: string;
  artistId: string;
  /** YYYY-MM-DD */
  date: string;
  venue?: { name?: string; location?: string; slug?: string };
  tourName?: string;
  tapes: number;
  sbd: boolean;
  /** Average tape rating; null when no tape has ratings. */
  rating: number | null;
  plays30d: number;
  /** When the show first appeared on Relisten (ISO). */
  addedAt: string;
};

/** One file of a song performance, with what the player needs to play it. */
export type PlayableTrack = {
  id: string;
  title: string;
  slug: string;
  mp3Url: string | null;
  duration: number | null;
  sourceId: string;
};

/** One time a song was played: a row on its page. */
export type SongPerformance = {
  show: ShowSummary;
  track?: PlayableTrack;
  /** Seconds; the median across tapes when played once in the show. */
  duration: number | null;
  /** Measured from files that also hold other songs (a segue), so it runs long. */
  durationApprox: boolean;
  /** When played more than once in the show: which time ("3 of 6"). */
  repeat?: { index: number; of: number };
};

export type SongDetail = {
  id: string;
  /** The song's current slug; differs from the URL's for a merged song. */
  slug: string;
  name: string;
  originalArtist?: string;
  aliases: string[];
  /** Setlist-only songs: v4 never matched tracks to these. */
  imported: boolean;
  performances: SongPerformance[];
};

export type VenueDetail = {
  id: string;
  name: string;
  location?: string;
  /** Other names the venue has gone by. */
  otherNames: string[];
  shows: ShowSummary[];
};

export type TourDetail = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  shows: ShowSummary[];
};
