// v4 resources → the app's domain types (src/domain/types.ts). Only these
// functions (and the other src/data modules) know what v4 looks like.
//
// v4 sends `null` for empty values; optional domain fields are `undefined`
// instead, so nulls become `undefined` here.

import { ArtistFeature, type ArtistFeatureName } from '@/api/generated/artistFeatures';
import type {
  ArtistResource,
  LinkResource,
  PopularityResource,
  ShowSummaryResource,
  SourceResource,
  SourceSetResource,
  TourResource,
  TrackResource,
  VenueResource,
  YearResource,
} from '@/api/generated/model';
import type {
  Artist,
  ArtistFeatures,
  Popularity,
  Source,
  SourceLink,
  SourceSet,
  TourSummary,
  Track,
  YearSummary,
} from '@/domain/types';

const opt = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

const WINDOWS = ['48h', '7d', '30d'] as const;

/** The API types every window as present; the data can still omit one, so a missing window stays missing. */
export const toPopularity = (p: PopularityResource | null | undefined): Popularity | null => {
  if (!p) return null;
  const popularity: Popularity = { momentumScore: p.momentum_score, trendRatio: p.trend_ratio };
  if (p.windows) {
    const windows: NonNullable<Popularity['windows']> = {};
    for (const w of WINDOWS) {
      const data = p.windows[w] as PopularityResource['windows'][typeof w] | undefined;
      if (data) windows[w] = { plays: data.plays, hours: data.hours, hotScore: data.hot_score };
    }
    popularity.windows = windows;
  }
  return popularity;
};

// The domain's feature keys are the API's flag names, camel-cased. A flag added
// to the API (or one dropped from the domain type) fails this check.
type FeatureKey = Uncapitalize<ArtistFeatureName>;
const featureKeysMatch: [FeatureKey, keyof ArtistFeatures] extends [
  keyof ArtistFeatures,
  FeatureKey,
]
  ? true
  : never = true;
void featureKeysMatch;

const FEATURE_BITS = Object.entries(ArtistFeature).map(
  ([name, bit]) => [(name[0].toLowerCase() + name.slice(1)) as FeatureKey, BigInt(bit)] as const
);

/**
 * Decodes the `features` mask: a decimal-string u64, so BigInt (numbers lose
 * bits past 2^53). Unknown bits are ignored. Anything else, such as a
 * malformed mask or a response cached before the mask shipped, means no features.
 */
export const toFeatures = (mask: unknown): ArtistFeatures | undefined => {
  if (typeof mask !== 'string' || !/^(0|[1-9][0-9]*)$/.test(mask)) return undefined;
  const bits = BigInt(mask);
  const features = {} as ArtistFeatures;
  for (const [key, bit] of FEATURE_BITS) features[key] = (bits & bit) !== BigInt(0);
  return features;
};

/** Null for an artist without a slug: nothing can link to it. A missing name falls back to the slug. */
export const toArtist = (a: ArtistResource): Artist | null =>
  a.slug
    ? {
        id: a.id,
        slug: a.slug,
        name: a.name ?? a.slug,
        sortName: opt(a.sort_name),
        featured: a.featured,
        showCount: a.show_count,
        sourceCount: a.source_count,
        popularity: toPopularity(a.popularity),
        features: toFeatures(a.features),
      }
    : null;

/** Null for a year without its year: the years column can't link it. */
export const toYearSummary = (y: YearResource): YearSummary | null =>
  y.year
    ? {
        id: y.id,
        year: y.year,
        showCount: y.show_count,
        sourceCount: y.source_count,
        popularity: toPopularity(y.popularity),
      }
    : null;

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
  return {
    name: opt(normalized?.name ?? imported?.name),
    location: normalized ? venueLocation(normalized) : opt(imported?.location),
    slug: normalized?.slug ?? imported?.id,
  };
};

/** Null for a tour without a slug: tour pages are addressed by slug. */
export const toTourSummary = (t: Omit<TourResource, 'shows'>): TourSummary | null =>
  t.slug
    ? {
        id: t.id,
        slug: t.slug,
        name: opt(t.name),
        startDate: opt(t.start_date),
        endDate: opt(t.end_date),
        showCount: t.show_count,
      }
    : null;

// Only what the player and track lists read; md5s and set/artist ids aren't used.
export const toTrack = (t: TrackResource): Track => ({
  id: t.id,
  sourceId: t.source_id,
  position: t.track_position,
  title: opt(t.title),
  slug: opt(t.slug),
  duration: opt(t.duration),
  mp3Url: t.mp3_url,
  flacUrl: t.flac_url,
});

const toSet = (s: SourceSetResource): SourceSet => ({
  id: s.id,
  index: s.index,
  name: opt(s.name),
  tracks: (s.tracks ?? []).map(toTrack),
});

const toLink = (l: LinkResource): SourceLink => ({ url: opt(l.url), label: opt(l.label) });

export const toSource = (s: SourceResource): Source => ({
  id: s.id,
  isSoundboard: s.is_soundboard,
  isRemaster: s.is_remaster,
  duration: s.duration,
  avgRating: s.avg_rating,
  avgRatingWeighted: s.avg_rating_weighted,
  numRatings: s.num_ratings,
  numReviews: s.num_reviews,
  upstreamIdentifier: opt(s.upstream_identifier),
  taper: opt(s.taper),
  transferrer: opt(s.transferrer),
  source: opt(s.source),
  lineage: opt(s.lineage),
  taperNotes: opt(s.taper_notes),
  links: (s.links ?? []).map(toLink),
  sets: (s.sets ?? []).map(toSet),
});
