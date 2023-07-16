export type Meta = {
  loaded: boolean;
  loading: boolean;
  error: boolean;
}

export type Artist = {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  sort_name: string;
  show_count: number;
  source_count: number;
  upstream_sources: null;
  featured: number;
  features: Features;
  musicbrainz_id: string;
  the: boolean;
  created_at: string;
  updated_at: string;
}

export type Day = {
  artist: Artist;
  artist_id: number;
  artist_uuid: string;
  venue_id: number;
  venue: Venue;
  venue_uuid: string;
  tour_id: null;
  tour_uuid: null;
  tour: null;
  year_id: number;
  year_uuid: string;
  year: Year;
  era_id: null;
  era: null;
  date: string;
  avg_rating: number;
  avg_duration: number;
  display_date: string;
  most_recent_source_updated_at: string;
  has_soundboard_source: boolean;
  has_streamable_flac_source: boolean;
  source_count: number;
  uuid: string;
  id: number;
  created_at: string;
  updated_at: string;
  artistName: string;
}

export type Venue = {
  shows_at_venue: number;
  artist_id: number;
  artist_uuid: string;
  latitude: null;
  longitude: null;
  name: string;
  location: string;
  upstream_identifier: string;
  slug: string;
  past_names: null;
  sortName: string;
  uuid: string;
  id: number;
  created_at: string;
  updated_at: string;
}

export type Year = {
  show_count: number;
  source_count: number;
  duration: number;
  avg_duration: number;
  avg_rating: number;
  year: string;
  artist_id: number;
  artist_uuid: string;
  uuid: string;
  id: number;
  created_at: string;
  updated_at: string;
}

export type Features = {
  id: number;
  descriptions: boolean;
  eras: boolean;
  multiple_sources: boolean;
  reviews: boolean;
  ratings: boolean;
  tours: boolean;
  taper_notes: boolean;
  source_information: boolean;
  sets: boolean;
  per_show_venues: boolean;
  per_source_venues: boolean;
  venue_coords: boolean;
  songs: boolean;
  years: boolean;
  track_md5s: boolean;
  review_titles: boolean;
  jam_charts: boolean;
  setlist_data_incomplete: boolean;
  artist_id: number;
  track_names: boolean;
  venue_past_names: boolean;
  reviews_have_ratings: boolean;
  track_durations: boolean;
  can_have_flac: boolean;
}

export type Track = {
  source_id: number,
  source_uuid: string,
  source_set_id: number,
  source_set_uuid: string,
  artist_id: number,
  artist_uuid: string;
  track_position: number;
  duration: number;
  title: string;
  slug: string;
  mp3_url: string | null;
  mp3_md5: string | null,
  flac_url: string | null,
  flac_md5: string | null,
  uuid: string,
  id: number,
  created_at: string;
  updated_at: string;
}

export interface Show {
  artist_id: number;
  artist_uuid: string;
  venue_id: number;
  venue: Venue;
  venue_uuid: string | null;
  tour_id: number | null;
  tour_uuid: string | null;
  tour: Tour | null;
  year_id: number;
  year_uuid: string;
  year: number | null;
  era_id: number | null;
  era: null;
  date: string;
  avg_rating: number;
  avg_duration: number;
  display_date: string;
  most_recent_source_updated_at: string;
  has_soundboard_source: boolean;
  has_streamable_flac_source: boolean;
  source_count: number;
  uuid: string;
  id: number;
  created_at: string;
  updated_at: string;
}

export type Source = {
  show_id: number;
  show_uuid: null;
  show: Show;
  artist: Artist;
  artist_id: number;
  artist_uuid: string;
  venue_id: number;
  venue_uuid: string | null;
  venue: Venue;
  display_date: string;
  is_soundboard: boolean;
  is_remaster: boolean;
  has_jamcharts: boolean;
  avg_rating: number;
  num_reviews: number;
  num_ratings: null;
  avg_rating_weighted: number;
  duration: number;
  upstream_identifier: string;
  uuid: string;
  id: number;
  created_at: string;
  updated_at: string;
}

export type ArtistShows = {
  shows?: Show[];
  show_count: number;
  source_count: number;
  duration: number;
  avg_duration: number;
  avg_rating: number;
  year: string;
  artist_id: number;
  artist_uuid: string;
  uuid: string;
  id: number;
  created_at: Date;
  updated_at: Date;
}

export type Tour = {
  artist_id: number;
  artist_uuid: string;
  start_date: string;
  end_date: string;
  name: string;
  slug: string;
  upstream_identifier: string;
  uuid: string;
  id: number;
  created_at: string;
  updated_at: string;
}
