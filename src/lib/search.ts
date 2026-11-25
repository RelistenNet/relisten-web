// Catalog and playlist search results, as the app renders them. Built on the
// server from /api/v4/search and the User Service's /v1/search (src/data/search.ts); shared by the /search page, the
// /api/search route, and GlobalSearch (client).

/** The result kinds the catalog returns that the app can link to. */
export const SEARCH_KINDS = [
  'artist',
  'song',
  'venue',
  'show',
  'performance',
  'recording',
  'review',
  'playlist',
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

/** The API's scopes: All, or one kind of result with its own pages. */
export const SEARCH_SCOPES = [
  'all',
  'artists',
  'songs',
  'venues',
  'shows',
  'sources',
  'reviews',
  'playlists',
] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];
export type ResultScope = Exclude<SearchScope, 'all'>;

/** A run of an excerpt: `match` is the part the query matched. */
export type ExcerptRun = { text: string; match: boolean };

export type SearchHit = {
  id: string;
  kind: SearchKind;
  title: string;
  /** Context under the title (artist, venue, city, set, duration), joined with " · ". */
  detail: string[];
  /** Where the query matched in a recording's notes or a review. */
  excerpt?: ExcerptRun[];
  soundboard?: boolean;
  /** A track result's length in seconds (shown after `detail`). */
  duration?: number;
  /** A track result's track (the recording its preview plays): what a playlist entry holds. */
  trackId?: string;
  href: string;
};

export type SearchResults = {
  /** `unavailable`: the catalog search couldn't answer. Not the same as no results. */
  availability: 'full' | 'unavailable';
  /** What the API read into the query (an artist, a year). */
  chips: string[];
  counts: Partial<Record<ResultScope, number>>;
  /** All: the best matches across kinds, ranked. */
  top: SearchHit[];
  /** All: the evidence groups the ranking leaves out of `top`. */
  recordings: SearchHit[];
  reviews: SearchHit[];
  /** One scope: this page of results. All: every hit, ranked. */
  results: SearchHit[];
  /** The page after this one, when the API has more. */
  nextPage?: number;
};

export const EMPTY_SEARCH: SearchResults = {
  availability: 'full',
  chips: [],
  counts: {},
  top: [],
  recordings: [],
  reviews: [],
  results: [],
};

export const UNAVAILABLE_SEARCH: SearchResults = { ...EMPTY_SEARCH, availability: 'unavailable' };

/** Shortest query the catalog searches. */
export const MIN_QUERY_LENGTH = 2;

export const KIND_LABEL: Record<SearchKind, string> = {
  artist: 'Artist',
  song: 'Song',
  venue: 'Venue',
  show: 'Show',
  performance: 'Track',
  recording: 'Recording',
  review: 'Review',
  playlist: 'Playlist',
};

export const SCOPE_LABEL: Record<SearchScope, string> = {
  all: 'All',
  artists: 'Artists',
  songs: 'Songs',
  venues: 'Venues',
  shows: 'Shows',
  sources: 'Recordings',
  reviews: 'Reviews',
  playlists: 'Playlists',
};
