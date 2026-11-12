export type Meta = {
  loaded: boolean;
  loading: boolean;
  error: boolean;
};

export type PopularityWindow = { plays: number; hot_score: number; hours: number };
export type Popularity = {
  momentum_score?: number;
  trend_ratio?: number;
  windows?: {
    '48h'?: PopularityWindow;
    '7d'?: PopularityWindow;
    '30d'?: PopularityWindow;
  };
};

export type Artist = {
  id: string;
  name?: string;
  slug?: string;
  sort_name?: string;
  show_count?: number;
  source_count?: number;
  upstream_sources?: null;
  featured?: number;
  features?: Features;
  musicbrainz_id?: string;
  the?: boolean;
  created_at?: string;
  updated_at?: string;
  popularity?: Popularity | null;
};

export type Day = {
  id: string;
  artist?: Artist;
  artist_id?: string;
  venue_id?: string;
  venue?: Venue;
  tour_id?: null;
  tour?: null;
  year_id?: string;
  year?: Year;
  era_id?: null;
  era?: null;
  date?: string;
  avg_rating?: number;
  avg_duration?: number;
  display_date?: string;
  most_recent_source_updated_at?: string;
  has_soundboard_source?: boolean;
  has_streamable_flac_source?: boolean;
  source_count?: number;
  created_at?: string;
  updated_at?: string;
  artistName?: string;
};

export type Venue = {
  shows_at_venue?: number;
  artist_id?: string;
  latitude?: null;
  longitude?: null;
  name?: string;
  location?: string;
  upstream_identifier?: string;
  slug?: string;
  past_names?: null;
  sortName?: string;
  id: string;
  created_at?: string;
  updated_at?: string;
};

export type Year = {
  id: string;
  show_count?: number;
  source_count?: number;
  duration?: number;
  avg_duration?: number;
  avg_rating?: number;
  year?: string;
  artist_id?: string;
  created_at?: string;
  updated_at?: string;
  has_soundboard_source?: boolean;
  popularity?: Popularity | null;
};

export type Features = {
  id?: string;
  normalization?: boolean;
  descriptions?: boolean;
  eras?: boolean;
  multiple_sources?: boolean;
  reviews?: boolean;
  ratings?: boolean;
  tours?: boolean;
  taper_notes?: boolean;
  source_information?: boolean;
  sets?: boolean;
  per_show_venues?: boolean;
  per_source_venues?: boolean;
  venue_coords?: boolean;
  songs?: boolean;
  years?: boolean;
  track_md5s?: boolean;
  review_titles?: boolean;
  jam_charts?: boolean;
  setlist_data_incomplete?: boolean;
  artist_id?: string;
  track_names?: boolean;
  venue_past_names?: boolean;
  reviews_have_ratings?: boolean;
  track_durations?: boolean;
  can_have_flac?: boolean;
};

export type Track = {
  id: string;
  /** v4 songs this track was matched to (more than one for a segue/medley track). */
  song_ids?: string[];
  source_id?: string;
  source_set_id?: string;
  artist_id?: string;
  track_position?: number;
  duration?: number;
  title?: string;
  slug?: string;
  mp3_url?: string | null;
  mp3_md5?: string | null;
  flac_url?: string | null;
  flac_md5?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Show = {
  id: string;
  artist_id?: string;
  venue_id?: string;
  venue?: Venue;
  tour_id?: string | null;
  tour?: Tour | null;
  year_id?: string;
  year?: number | null;
  era_id?: string | null;
  era?: null;
  date?: string;
  avg_rating?: number;
  avg_duration?: number;
  display_date?: string;
  most_recent_source_updated_at?: string;
  has_soundboard_source?: boolean;
  has_streamable_flac_source?: boolean;
  source_count?: number;
  created_at?: string;
  updated_at?: string;
  popularity?: Popularity | null;
};

export type TrackSource = {
  id: string;
  show_id?: string;
  show?: Show;
  artist?: Artist;
  artist_id?: string;
  venue_id?: string;
  venue?: Venue;
  display_date?: string;
  is_soundboard?: boolean;
  is_remaster?: boolean;
  has_jamcharts?: boolean;
  avg_rating?: number;
  num_reviews?: number;
  num_ratings?: null;
  avg_rating_weighted?: number;
  duration?: number;
  upstream_identifier?: string;
  created_at?: string;
  updated_at?: string;
};

export type LiveHistoryItem = {
  id: string;
  app_type_description: string;
  created_at: string;
  track: {
    source: TrackSource;
    track: Track;
  };
};

export type ArtistShows = {
  id: string;
  shows?: Show[];
  show_count?: number;
  source_count?: number;
  duration?: number;
  avg_duration?: number;
  avg_rating?: number;
  year?: string;
  artist_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type Song = {
  id: string;
  shows_played_at?: number;
  artist_id?: string;
  name?: string;
  slug?: string;
  upstream_identifier?: string;
  sortName?: string;
  created_at?: string;
  updated_at?: string;
};

export type Tour = {
  id: string;
  artist_id?: string;
  start_date?: string;
  end_date?: string;
  name?: string;
  slug?: string;
  upstream_identifier?: string;
  shows_on_tour?: number;
  created_at?: string;
  updated_at?: string;
};

export type Set = {
  id: string;
  source_id?: string;
  artist_id?: string;
  index?: number;
  is_encore?: boolean;
  name?: string;
  tracks?: Track[];
  created_at?: string;
  updated_at?: string;
};

export type Link = {
  id: string;
  source_id?: string;
  upstream_source_id?: string;
  for_reviews?: boolean;
  for_ratings?: boolean;
  for_source?: boolean;
  url?: string;
  label?: string;
  created_at?: string;
  updated_at?: string;
};

export type Source = {
  id: string;
  review_count?: number;
  sets?: Set[];
  links?: Link[];
  show_id?: string;
  show?: null;
  description?: string;
  taper_notes?: string;
  source?: string;
  taper?: string;
  transferrer?: string;
  lineage?: string;
  flac_type?: string;
  artist_id?: string;
  venue_id?: string;
  venue?: null;
  display_date?: string;
  is_soundboard?: boolean;
  is_remaster?: boolean;
  has_jamcharts?: boolean;
  avg_rating?: number;
  num_reviews?: number;
  num_ratings?: number | null;
  avg_rating_weighted?: number;
  duration?: number;
  upstream_identifier?: string;
  created_at?: string;
  updated_at?: string;
};

export type GaplessMetadata = {
  index?: number;
  playbackType?: string;
  metadata?: {
    trackId?: string;
    [key: string]: unknown;
  };
  trackMetadata?: {
    trackId?: string;
    [key: string]: unknown;
  };
  webAudioLoadingState?: string;
};

export type Tape = {
  id: string;
  sources?: Source[];
  popularity?: Popularity | null;
  artist_id?: string;
  venue_id?: string;
  venue?: Venue;
  tour_id?: string | null;
  tour?: Tour;
  year_id?: string;
  year?: Year;
  era_id?: string | null;
  era?: null;
  date?: string;
  avg_rating?: number;
  avg_duration?: number;
  display_date?: string;
  most_recent_source_updated_at?: string;
  has_soundboard_source?: boolean;
  has_streamable_flac_source?: boolean;
  source_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type Playback = {
  year?: string;
  tracks?: Track[];
  source?: string;
  songSlug?: string;
  showDate?: string;
  paused?: boolean;
  month?: string | undefined;
  day?: string | undefined;
  gaplessTracksMetadata?: GaplessMetadata[];
  currentTrackId?: string | undefined;
  artistSlug?: string;
  activeTrack?: ActiveTrack;
};

export type ActiveTrack = {
  currentTime?: number;
  duration?: number;
  index?: number;
  isPaused?: boolean;
  playbackType?: string;
  webAudioLoadingState?: string;
};

export type VenueWithShows = Venue & { shows?: Show[] };
export type SongWithShows = Song & { shows?: Show[] };
export type TourWithShows = Tour & { shows?: Show[] };
