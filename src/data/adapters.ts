// v4 resources → the app's own types (src/types.ts). Components keep reading the
// shapes they always have; only these functions know what v4 looks like.
//
// v4 sends `null` for empty values; the app types use optional fields, so nulls
// become `undefined` here.

import type {
  ArtistFeaturesResource,
  ArtistResource,
  LinkResource,
  ShowResource,
  ShowSummaryResource,
  SourceResource,
  SourceSetResource,
  TourResource,
  TrackResource,
  VenueResource,
  YearResource,
  YearWithShowsResource,
} from '@/api/generated/model';
import type {
  Artist,
  ArtistShows,
  Features,
  Link,
  Popularity,
  Set,
  Show,
  Source,
  Tape,
  Tour,
  Track,
  Venue,
  Year,
} from '@/types';

const opt = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

type V4Popularity = {
  momentum_score: number;
  trend_ratio: number;
  windows: Popularity['windows'];
} | null;

const toPopularity = (p: V4Popularity): Popularity | null => p;

export const toFeatures = (f: ArtistFeaturesResource | null | undefined): Features | undefined =>
  f ? { ...f } : undefined;

export const toArtist = (a: ArtistResource): Artist => ({
  id: a.id,
  slug: opt(a.slug),
  name: opt(a.name),
  sort_name: opt(a.sort_name),
  featured: a.featured,
  show_count: a.show_count,
  source_count: a.source_count,
  musicbrainz_id: opt(a.musicbrainz_id),
  features: toFeatures(a.features),
  popularity: toPopularity(a.popularity),
});

export const toYear = (y: YearResource): Year => ({
  id: y.id,
  year: opt(y.year),
  artist_id: y.artist_id,
  show_count: y.show_count,
  source_count: y.source_count,
  duration: opt(y.duration),
  avg_duration: opt(y.avg_duration),
  avg_rating: y.avg_rating,
  popularity: toPopularity(y.popularity),
});

/** "Ithaca, NY" for US venues, "London, GB" elsewhere. */
export const venueLocation = (v: VenueResource) =>
  [v.city, v.country === 'US' ? v.region : (v.region ?? v.country)].filter(Boolean).join(', ');

/**
 * A venue page's `?slug=` value. Canonical venues use their slug. Venues known
 * only from imported setlists use their id instead: their artist-specific slugs
 * can collide with canonical ones ("studio", "unknown").
 */
export const IMPORTED_VENUE_PREFIX = 'imported_venue_';

/**
 * The show's venue. Prefers the canonical venue (artist_venue); falls back to
 * the imported one. `slug` is the venue page's slug (an imported venue's id when it has no canonical one).
 */
export const showVenue = (s: Pick<ShowSummaryResource, 'artist_venue' | 'imported_venue'>) => {
  const normalized = s.artist_venue?.venue;
  const imported = s.imported_venue;
  const id = normalized?.id ?? imported?.id;
  if (!id) return undefined;
  const venue: Venue = {
    id,
    name: opt(normalized?.name ?? imported?.name),
    location: normalized ? venueLocation(normalized) : opt(imported?.location),
    slug: normalized?.slug ?? imported?.id,
    latitude: null,
    longitude: null,
  };
  return venue;
};

export const toTour = (
  t: Omit<TourResource, 'shows'> | NonNullable<ShowSummaryResource['tour']>
): Tour => ({
  id: t.id,
  artist_id: t.artist_id,
  name: opt(t.name),
  slug: opt(t.slug),
  start_date: opt(t.start_date),
  end_date: opt(t.end_date),
  upstream_identifier: opt(t.upstream_identifier),
  shows_on_tour: t.show_count,
});

export const toShow = (s: ShowSummaryResource): Show => ({
  id: s.id,
  artist_id: s.artist_id,
  year_id: opt(s.year_id),
  tour_id: s.tour_id,
  date: s.date,
  display_date: opt(s.display_date),
  avg_rating: s.avg_rating,
  avg_duration: opt(s.avg_duration),
  most_recent_source_updated_at: s.most_recent_source_updated_at,
  has_soundboard_source: s.has_soundboard_source,
  has_streamable_flac_source: s.has_streamable_flac_source,
  source_count: s.source_count,
  popularity: toPopularity(s.popularity),
  venue: showVenue(s),
  tour: s.tour ? toTour(s.tour) : null,
});

export const toShows = (shows: ShowSummaryResource[] | null | undefined): Show[] =>
  (shows ?? []).map(toShow);

// Only what the player and track lists read; md5s and set/artist ids aren't used.
export const toTrack = (t: TrackResource): Track => ({
  id: t.id,
  source_id: t.source_id,
  track_position: t.track_position,
  duration: opt(t.duration),
  title: opt(t.title),
  slug: opt(t.slug),
  mp3_url: t.mp3_url,
  flac_url: t.flac_url,
});

const toSet = (s: SourceSetResource): Set => ({
  id: s.id,
  source_id: s.source_id,
  artist_id: s.artist_id,
  index: s.index,
  is_encore: s.is_encore,
  name: opt(s.name),
  tracks: (s.tracks ?? []).map(toTrack),
});

// v4 links have no id of their own; the URL is unique within a source.
const toLink = (l: LinkResource): Link => ({
  id: l.url ?? '',
  source_id: l.source_id,
  for_reviews: l.for_reviews,
  for_ratings: l.for_ratings,
  for_source: l.for_source,
  url: opt(l.url),
  label: opt(l.label),
});

export const toSource = (s: SourceResource): Source => ({
  id: s.id,
  show_id: s.show_id,
  artist_id: s.artist_id,
  display_date: opt(s.display_date),
  is_soundboard: s.is_soundboard,
  is_remaster: s.is_remaster,
  has_jamcharts: s.has_jamcharts,
  avg_rating: s.avg_rating,
  num_reviews: s.num_reviews,
  num_ratings: s.num_ratings,
  avg_rating_weighted: s.avg_rating_weighted,
  duration: s.duration,
  upstream_identifier: opt(s.upstream_identifier),
  description: opt(s.description),
  taper_notes: opt(s.taper_notes),
  source: opt(s.source),
  taper: opt(s.taper),
  transferrer: opt(s.transferrer),
  lineage: opt(s.lineage),
  flac_type: s.flac_type,
  review_count: s.review_count,
  sets: (s.sets ?? []).map(toSet),
  links: (s.links ?? []).map(toLink),
});

export const toTape = (s: ShowResource): Tape => {
  const show = toShow(s);
  return {
    ...show,
    tour: show.tour ?? undefined,
    year: s.year ? toYear(s.year) : undefined,
    sources: (s.sources ?? []).map(toSource),
  };
};

export const toArtistShows = (y: YearWithShowsResource): ArtistShows => ({
  id: y.id,
  year: opt(y.year),
  artist_id: y.artist_id,
  show_count: y.show_count,
  source_count: y.source_count,
  duration: opt(y.duration),
  avg_duration: opt(y.avg_duration),
  avg_rating: y.avg_rating,
  shows: toShows(y.shows),
});
