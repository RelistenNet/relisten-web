import { describe, expect, it } from 'vitest';
import { fromArtistRow, isPrimaryArtist, toArtistRow } from './artistRows';
import type { Artist } from '@/types';

const artist: Artist = {
  id: 1,
  uuid: '77a58ff9-2e01-c59c-b8eb-cff106049b72',
  name: 'Grateful Dead',
  slug: 'grateful-dead',
  show_count: 2400,
  source_count: 17000,
  featured: 1,
  created_at: '2014-01-01T00:00:00Z',
  popularity: {
    momentum_score: 3.2,
    trend_ratio: 1.1,
    windows: {
      '48h': { plays: 120, hours: 0.4, hot_score: 9 },
      '7d': { plays: 900, hours: 61.7, hot_score: 8 },
      '30d': { plays: 4100, hours: 288.2, hot_score: 7 },
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
      show_count: 2400,
      source_count: 17000,
      popularity: {
        windows: {
          '48h': { plays: 120, hours: 0.4, hot_score: 0 },
          '7d': { plays: 900, hours: 62, hot_score: 0 },
          '30d': { plays: 4100, hours: 288, hot_score: 0 },
        },
      },
    });
  });

  it('rounds hours to what formatHours displays', () => {
    const row = toArtistRow(artist);
    // 0.4h displays as 24m; whole hours above that.
    expect(Math.round((row[6] as number) * 60)).toBe(24);
    expect(row[8]).toBe(62);
  });

  it('omits windows for artists without popularity', () => {
    const row = toArtistRow({ ...artist, popularity: null });
    expect(row).toEqual(['grateful-dead', 'Grateful Dead', 1, 2400, 17000]);
    expect(fromArtistRow(row).popularity).toBeNull();
  });

  it('keeps a missing window missing', () => {
    const windows = { '30d': { plays: 5, hours: 2, hot_score: 1 } };
    const item = fromArtistRow(toArtistRow({ ...artist, popularity: { windows } }));
    expect(item.popularity?.windows).toEqual({ '30d': { plays: 5, hours: 2, hot_score: 0 } });
  });

  it('treats featured 0 and 1 as primary', () => {
    expect(isPrimaryArtist({ featured: 0 })).toBe(true);
    expect(isPrimaryArtist({ featured: 1 })).toBe(true);
    expect(isPrimaryArtist({ featured: 2 })).toBe(false);
  });
});
