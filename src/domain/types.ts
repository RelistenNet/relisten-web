// The app's own types for catalog data, independent of the API's shapes. Data
// loaders (src/data) produce these; views build on them. Generated API types
// stay inside src/data.
//
/** Plays and listening hours over a recent window. */
export type PopularityWindow = { plays: number; hours: number; hotScore: number };

export type Popularity = {
  momentumScore?: number;
  trendRatio?: number;
  windows?: {
    '48h'?: PopularityWindow;
    '7d'?: PopularityWindow;
    '30d'?: PopularityWindow;
  };
};

/** What an artist's catalog has: which tabs and details its pages can show. */
export type ArtistFeatures = {
  descriptions: boolean;
  eras: boolean;
  multipleSources: boolean;
  reviews: boolean;
  ratings: boolean;
  tours: boolean;
  taperNotes: boolean;
  sourceInformation: boolean;
  sets: boolean;
  perShowVenues: boolean;
  perSourceVenues: boolean;
  venueCoords: boolean;
  songs: boolean;
  years: boolean;
  trackMd5s: boolean;
  reviewTitles: boolean;
  jamCharts: boolean;
  setlistDataIncomplete: boolean;
  trackNames: boolean;
  venuePastNames: boolean;
  reviewsHaveRatings: boolean;
  trackDurations: boolean;
  canHaveFlac: boolean;
  normalization: boolean;
};

export type Artist = {
  id: string;
  slug: string;
  name: string;
  sortName?: string;
  /** 0 or 1: a primary artist; higher: the archive. */
  featured: number;
  showCount: number;
  sourceCount: number;
  popularity: Popularity | null;
  features?: ArtistFeatures;
};

/** A year of an artist's shows, for the browse view's years column. */
export type YearSummary = {
  id: string;
  /** "1977" */
  year: string;
  showCount: number;
  sourceCount: number;
  popularity: Popularity | null;
};

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
  /** Browse view only (a year's shows): average tape length, in seconds. */
  avgDuration?: number | null;
  /** Browse view only (a year's shows): the full popularity windows, for the badge. */
  popularity?: Popularity | null;
};

/** A show page's show: the summary plus every tape, sorted for display. */
export type ShowDetail = ShowSummary & { sources: Source[] };

/** One tape (v4 "source") of a show. */
export type Source = {
  id: string;
  isSoundboard: boolean;
  isRemaster: boolean;
  /** Seconds. */
  duration: number;
  avgRating: number;
  avgRatingWeighted: number;
  numRatings: number | null;
  numReviews: number;
  /** The etree SHNID, or the archive.org identifier. */
  upstreamIdentifier?: string;
  taper?: string;
  transferrer?: string;
  source?: string;
  lineage?: string;
  taperNotes?: string;
  links: SourceLink[];
  /** In set order. */
  sets: SourceSet[];
};

export type SourceLink = { url?: string; label?: string };

export type SourceSet = {
  id: string;
  index: number;
  name?: string;
  /** In play order. */
  tracks: Track[];
};

/**
 * What the player needs to play a file. Song pages carry just this for a
 * performance's file; a tape's tracks are full `Track`s.
 */
export type PlayableTrack = {
  id: string;
  sourceId: string;
  title?: string;
  slug?: string;
  /** Seconds. */
  duration?: number;
  mp3Url: string | null;
  flacUrl?: string | null;
};

/** One file of a tape. */
export type Track = PlayableTrack & {
  /** 1-based, within the tape. */
  position: number;
  flacUrl: string | null;
};

/** A row of an artist's song list. */
export type SongListItem = {
  id: string;
  slug: string;
  name?: string;
  /** Shows with a recording of it (canonical songs), or on setlists (imported songs). */
  showCount: number;
  /** Imported (setlist-only) songs linked to a canonical song: that song's id. */
  canonicalId?: string;
};

/** A row of an artist's venue list. `slug` is the venue page's (an imported venue's id). */
export type VenueListItem = {
  id: string;
  slug: string;
  name?: string;
  location?: string;
  /** The artist's shows there. */
  showCount: number;
};

/** A row of an artist's tour list. */
export type TourSummary = {
  id: string;
  slug: string;
  name?: string;
  /** ISO */
  startDate?: string;
  /** ISO */
  endDate?: string;
  showCount: number;
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
