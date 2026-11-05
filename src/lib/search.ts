// The /api/search response. Shared by the route (server) and GlobalSearch (client).

export type SearchArtist = { name: string; slug: string; featured: number };

export type SearchItem = {
  name: string;
  slug: string;
  location?: string;
  /** Shows the song was played at / shows at the venue / shows on the tour. */
  show_count: number;
  artist: SearchArtist;
};

export type SearchResults = {
  artists: SearchArtist[];
  songs: SearchItem[];
  venues: SearchItem[];
  tours: SearchItem[];
};

export const EMPTY_SEARCH: SearchResults = { artists: [], songs: [], venues: [], tours: [] };
