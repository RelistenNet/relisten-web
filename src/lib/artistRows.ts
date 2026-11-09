import type { Artist, ArtistFeatures, Popularity } from '@/domain/types';

/**
 * The artist as the artists column uses it: only the fields that
 * ArtistsColumnWithControls and PopularityBadge read. `Artist` is assignable
 * to it, so server code can pass full artists where convenient.
 */
export type ArtistListItem = Pick<
  Artist,
  'slug' | 'name' | 'featured' | 'showCount' | 'sourceCount' | 'popularity'
> & {
  /** Rows carry only the section features (SECTION_FEATURES). */
  features?: Partial<ArtistFeatures>;
};

/**
 * The features the rows carry: the ones artistSections reads, so the artist
 * picker can tell which sections an artist has. A bit each.
 */
const SECTION_FEATURES = ['normalization', 'perShowVenues', 'perSourceVenues', 'tours'] as const;

const toFeatureBits = (features: Partial<ArtistFeatures> | undefined) =>
  SECTION_FEATURES.reduce((bits, f, i) => (features?.[f] ? bits | (1 << i) : bits), 0);

const fromFeatureBits = (bits: number): Partial<ArtistFeatures> =>
  Object.fromEntries(SECTION_FEATURES.map((f, i) => [f, !!(bits & (1 << i))]));

/**
 * Compact wire format for the artists column.
 *
 * Every page embeds the artist list in its Flight payload, so each artist
 * travels as a positional array of primitives instead of an object with
 * nested popularity windows: no repeated key names, and arrays of primitives
 * are much cheaper for Flight to serialize and for SSR to decode.
 *
 *   [slug, name, featured, showCount, sourceCount, featureBits,
 *    plays48h, hours48h, plays7d, hours7d, plays30d, hours30d]
 *
 * The six window values are present only when the artist has popularity
 * data; a window the API omitted is `null, null`.
 */
export type ArtistRow = [
  slug: string,
  name: string,
  featured: number,
  showCount: number,
  sourceCount: number,
  /** The section features (SECTION_FEATURES), a bit each. */
  featureBits: number,
  ...windows: (number | null)[],
];

const WINDOWS = ['48h', '7d', '30d'] as const;

/** Hours only display as whole hours, or minutes below one hour. */
const roundHours = (h: number) => (h < 1 ? Math.round(h * 600) / 600 : Math.round(h));

export function toArtistRow(artist: ArtistListItem): ArtistRow {
  const row: ArtistRow = [
    artist.slug,
    artist.name,
    Number(artist.featured),
    artist.showCount,
    artist.sourceCount,
    toFeatureBits(artist.features),
  ];
  const windows = artist.popularity?.windows;
  if (windows) {
    for (const w of WINDOWS) {
      const data = windows[w];
      row.push(data ? data.plays : null, data ? roundHours(data.hours) : null);
    }
  }
  return row;
}

export function fromArtistRow(row: ArtistRow): ArtistListItem {
  const [slug, name, featured, showCount, sourceCount, featureBits] = row;
  let popularity: Popularity | null = null;
  if (row.length > 6) {
    const windows: NonNullable<Popularity['windows']> = {};
    WINDOWS.forEach((w, i) => {
      const plays = row[6 + i * 2] as number | null;
      const hours = row[7 + i * 2] as number | null;
      if (plays != null && hours != null) windows[w] = { plays, hours, hotScore: 0 };
    });
    popularity = { windows };
  }
  const features = fromFeatureBits(featureBits);
  return { slug, name, featured, showCount, sourceCount, popularity, features };
}

/** Primary (featured ≤ 1) artists are shown first and sent with the page shell. */
export const isPrimaryArtist = (artist: Pick<Artist, 'featured'>) => Number(artist.featured) <= 1;

/** An artist's plays over the last 30 days: what "popular" sorts by. */
export const artistPlays = (artist: Pick<ArtistListItem, 'popularity'>) =>
  artist.popularity?.windows?.['30d']?.plays ?? 0;

const GROUPS = [
  { key: 'featured', label: 'Featured Artists' },
  { key: 'primary', label: 'Primary Artists' },
  { key: 'archive', label: 'Archive Artists' },
] as const;

const groupIndex = (featured: Artist['featured']) =>
  Number(featured) === 1 ? 0 : Number(featured) === 0 ? 1 : 2;

/**
 * Artists in their groups, as the artists column and the artist picker list
 * them: featured (1), then primary (0), then archive. Keeps the order within
 * each group; empty groups are left out.
 */
export function groupArtists<T extends Pick<ArtistListItem, 'featured'>>(artists: T[]) {
  const groups = GROUPS.map((g) => ({ ...g, artists: [] as T[] }));
  for (const artist of artists) groups[groupIndex(artist.featured)].artists.push(artist);
  return groups.filter((g) => g.artists.length);
}
