// Generated from ArtistResource.features.x-feature-flags by scripts/gen-artist-features.mjs. Do not edit.

/** Artist feature flags: each value is the flag's bit in the decimal-string `features` mask. */
export const ArtistFeature = {
  Descriptions: '1',
  Eras: '2',
  MultipleSources: '4',
  Reviews: '8',
  Ratings: '16',
  Tours: '32',
  TaperNotes: '64',
  SourceInformation: '128',
  Sets: '256',
  PerShowVenues: '512',
  PerSourceVenues: '1024',
  VenueCoords: '2048',
  Songs: '4096',
  Years: '8192',
  TrackMd5s: '16384',
  ReviewTitles: '32768',
  JamCharts: '65536',
  SetlistDataIncomplete: '131072',
  TrackNames: '262144',
  VenuePastNames: '524288',
  ReviewsHaveRatings: '1048576',
  TrackDurations: '2097152',
  CanHaveFlac: '4194304',
  Normalization: '8388608',
} as const;

export type ArtistFeatureName = keyof typeof ArtistFeature;
