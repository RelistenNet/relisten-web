import { describe, expect, it } from 'vitest';
import { fromArtistRow, groupArtists, isPrimaryArtist, toArtistRow } from './artistRows';
import type { Artist } from '@/domain/types';

const artist: Artist = {
  id: 'artist_3qmp7zjbg1rpebhtyfy43096vj',
  name: 'Grateful Dead',
  slug: 'grateful-dead',
  showCount: 2400,
  sourceCount: 17000,
  featured: 1,
  features: { normalization: true, perSourceVenues: true } as Artist['features'],
  popularity: {
    momentumScore: 3.2,
    trendRatio: 1.1,
    windows: {
      '48h': { plays: 120, hours: 0.4, hotScore: 9 },
      '7d': { plays: 900, hours: 61.7, hotScore: 8 },
      '30d': { plays: 4100, hours: 288.2, hotScore: 7 },
    },
  },
};

describe('artist rows', () => {
  it('keeps the fields the artists column reads', () => {
    const item = fromArtistRow(toArtistRow(artist));
    expect(item).toEqual({
      slug: 'grateful-dead',
      name: 'Grateful Dead',
      featured: 1,
      showCount: 2400,
      sourceCount: 17000,
      features: {
        normalization: true,
        perShowVenues: false,
        perSourceVenues: true,
        tours: false,
      },
      popularity: {
        windows: {
          '48h': { plays: 120, hours: 0.4, hotScore: 0 },
          '7d': { plays: 900, hours: 62, hotScore: 0 },
          '30d': { plays: 4100, hours: 288, hotScore: 0 },
        },
      },
    });
  });

  it('rounds hours to what formatHours displays', () => {
    const row = toArtistRow(artist);
    // 0.4h displays as 24m; whole hours above that.
    expect(Math.round((row[7] as number) * 60)).toBe(24);
    expect(row[9]).toBe(62);
  });

  it('omits windows for artists without popularity', () => {
    const row = toArtistRow({ ...artist, popularity: null });
    expect(row).toEqual(['grateful-dead', 'Grateful Dead', 1, 2400, 17000, 0b0101]);
    expect(fromArtistRow(row).popularity).toBeNull();
  });

  it('keeps a missing window missing', () => {
    const windows = { '30d': { plays: 5, hours: 2, hotScore: 1 } };
    const item = fromArtistRow(toArtistRow({ ...artist, popularity: { windows } }));
    expect(item.popularity?.windows).toEqual({ '30d': { plays: 5, hours: 2, hotScore: 0 } });
  });

  it('treats featured 0 and 1 as primary', () => {
    expect(isPrimaryArtist({ featured: 0 })).toBe(true);
    expect(isPrimaryArtist({ featured: 1 })).toBe(true);
    expect(isPrimaryArtist({ featured: 2 })).toBe(false);
  });

  it('groups featured, then primary, then archive, keeping order within each', () => {
    const a = (slug: string, featured: number) => ({ slug, featured });
    const groups = groupArtists([a('x', 2), a('p1', 0), a('f1', 1), a('p2', 0), a('y', 3)]);
    expect(groups.map((g) => [g.label, g.artists.map((x) => x.slug)])).toEqual([
      ['Featured Artists', ['f1']],
      ['Primary Artists', ['p1', 'p2']],
      ['Archive Artists', ['x', 'y']],
    ]);
    expect(groupArtists([a('p', 0)]).map((g) => g.key)).toEqual(['primary']);
  });
});
