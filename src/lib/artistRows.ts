import type { Artist, Popularity } from '@/types';

/**
 * The artist as the artists column uses it: only the fields that
 * ArtistsColumnWithControls and PopularityBadge read. `Artist` is assignable
 * to it, so server code can pass full artists where convenient.
 */
export type ArtistListItem = Pick<
  Artist,
  'slug' | 'name' | 'featured' | 'show_count' | 'source_count' | 'popularity'
>;

/**
 * Compact wire format for the artists column.
 *
 * Every page embeds the artist list in its Flight payload, so each artist
 * travels as a positional array of primitives instead of an object with
 * nested popularity windows: no repeated key names, and arrays of primitives
 * are much cheaper for Flight to serialize and for SSR to decode.
 *
 *   [slug, name, featured, show_count, source_count,
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
  ...windows: (number | null)[],
];

const WINDOWS = ['48h', '7d', '30d'] as const;

/** Hours only display as whole hours, or minutes below one hour. */
const roundHours = (h: number) => (h < 1 ? Math.round(h * 600) / 600 : Math.round(h));

export function toArtistRow(artist: ArtistListItem): ArtistRow {
  const row: ArtistRow = [
    artist.slug ?? '',
    artist.name ?? '',
    Number(artist.featured ?? 0),
    artist.show_count ?? 0,
    artist.source_count ?? 0,
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
  const [slug, name, featured, show_count, source_count] = row;
  let popularity: Popularity | null = null;
  if (row.length > 5) {
    const windows: NonNullable<Popularity['windows']> = {};
    WINDOWS.forEach((w, i) => {
      const plays = row[5 + i * 2] as number | null;
      const hours = row[6 + i * 2] as number | null;
      if (plays != null && hours != null) windows[w] = { plays, hours, hot_score: 0 };
    });
    popularity = { windows };
  }
  return { slug, name, featured, show_count, source_count, popularity };
}

/** Primary (featured ≤ 1) artists are shown first and sent with the page shell. */
export const isPrimaryArtist = (artist: Pick<Artist, 'featured'>) => Number(artist.featured) <= 1;
