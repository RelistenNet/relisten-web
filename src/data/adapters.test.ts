import { describe, expect, it } from 'vitest';
import type { VenueResource } from '@/api/generated/model';
import {
  showVenue,
  toArtist,
  toFeatures,
  toPopularity,
  toTourSummary,
  toTrack,
  toYearSummary,
  venueLocation,
} from './adapters';
import { toShowDetail } from './summaries';
import { gd770508 as show, must } from './__fixtures__';

const venue = (v: Partial<VenueResource>) => ({ ...must(show.artist_venue).venue, ...v });
const firstSource = must(show.sources?.[0]);
const firstTrack = must(firstSource.sets?.[0]?.tracks?.[0]);

describe('venueLocation', () => {
  it.each([
    ['a US venue: city and state', {}, 'Ithaca, NY'],
    [
      'elsewhere: city and region',
      { country: 'GB', region: 'England', city: 'London' },
      'London, England',
    ],
    [
      'elsewhere without a region: city and country',
      { country: 'NL', region: null, city: 'Amsterdam' },
      'Amsterdam, NL',
    ],
    ['no city', { city: null }, 'NY'],
    ['nothing', { city: null, region: null, country: null }, ''],
  ])('%s', (_, overrides, expected) => {
    expect(venueLocation(venue(overrides))).toBe(expected);
  });
});

describe('showVenue', () => {
  it('prefers the canonical venue', () => {
    expect(showVenue(show)).toEqual({
      name: 'Barton Hall',
      location: 'Ithaca, NY',
      slug: 'barton-hall',
    });
  });

  it('falls back to the imported venue, linked by its id (not its slug)', () => {
    expect(showVenue({ artist_venue: null, imported_venue: show.imported_venue })).toEqual({
      name: 'Barton Hall, Cornell University',
      location: 'Ithaca, NY, USA',
      slug: 'imported_venue_19z7vw041a93fmvx8370hnc6g9',
    });
  });

  it('is undefined with no venue at all', () => {
    expect(showVenue({ artist_venue: null, imported_venue: null })).toBeUndefined();
  });
});

describe('toTrack', () => {
  it('keeps only what the player reads', () => {
    expect(toTrack(firstTrack)).toEqual({
      id: 'track_4rc5e1za2bvsrnnr0edzzj8rfs',
      sourceId: 'source_7bbw2e16a0h9ssczd3bwzgv1wp',
      position: 1,
      duration: 381,
      title: 'Minglewood Blues',
      slug: 'minglewood-blues',
      mp3Url:
        'https://archive.org/download/gd77-05-08.sbd.hicks.4982.sbeok.shnf/gd77-05-08eaton-d1t01.mp3',
      flacUrl: null,
    });
  });

  it('turns null strings into undefined', () => {
    const t = toTrack({ ...firstTrack, title: null, slug: null, duration: null });
    expect(t.title).toBeUndefined();
    expect(t.slug).toBeUndefined();
    expect(t.duration).toBeUndefined();
  });
});

describe('toShowDetail', () => {
  const detail = toShowDetail(show);

  it('carries the show summary', () => {
    expect(detail).toMatchObject({
      id: 'show_0g9jbeawcz6sqvebcdadr9s070',
      artistId: 'artist_3qmp7zjbg1rpebhtyfy43096vj',
      date: '1977-05-08',
      tapes: 23,
      sbd: true,
      venue: { slug: 'barton-hall', name: 'Barton Hall', location: 'Ithaca, NY' },
      tourName: 'Spring 1977',
    });
    // Show pages don't read these; only the browse view's year list carries them.
    expect(detail).not.toHaveProperty('popularity');
    expect(detail).not.toHaveProperty('avgDuration');
  });

  it('converts tapes, sets, tracks, and links', () => {
    expect(detail.sources.map((s) => s.id)).toEqual([
      'source_7bbw2e16a0h9ssczd3bwzgv1wp',
      'source_44hnyeravdzbq7cree9ayhhjr1',
    ]);
    const [first] = detail.sources;
    expect(first).toMatchObject({
      isSoundboard: true,
      isRemaster: false,
      duration: 10802,
      avgRating: 9.567009925842285,
      avgRatingWeighted: 7.758251667022705,
      numRatings: null,
      numReviews: 300,
      upstreamIdentifier: 'gd77-05-08.sbd.hicks.4982.sbeok.shnf',
    });
    expect(first.taperNotes).toMatch(/^freshly remastered Betty Board/);
    expect(first.sets).toHaveLength(1);
    expect(first.sets[0]).toMatchObject({ index: 0, name: 'Set' });
    expect(first.sets[0].tracks.map((t) => [t.position, t.title])).toEqual([
      [1, 'Minglewood Blues'],
      [2, 'Loser'],
    ]);
    expect(first.links).toEqual([
      {
        url: 'https://archive.org/details/gd77-05-08.sbd.hicks.4982.sbeok.shnf',
        label: 'View on archive.org',
      },
    ]);
  });

  it('sorts tapes for display and tracks for play', () => {
    const [a, b] = must(show.sources);
    const reversed = toShowDetail({
      ...show,
      sources: [
        b,
        {
          ...a,
          sets: must(a.sets).map((set) => ({ ...set, tracks: [...must(set.tracks)].reverse() })),
        },
      ],
    });
    expect(reversed.sources.map((s) => s.id)).toEqual(detail.sources.map((s) => s.id));
    expect(reversed.sources[0].sets[0].tracks.map((t) => t.position)).toEqual([1, 2]);
  });

  it('handles missing pieces', () => {
    const bare = toShowDetail({
      ...show,
      display_date: null,
      tour: null,
      year: null,
      sources: null,
      artist_venue: null,
      imported_venue: null,
    });
    expect(bare.date).toBe('');
    expect(bare.tourName).toBeUndefined();
    expect(bare.venue).toBeUndefined();
    expect(bare.sources).toEqual([]);

    const noSets = toShowDetail({
      ...show,
      sources: [{ ...firstSource, sets: null, links: null }],
    });
    expect(noSets.sources[0].sets).toEqual([]);
    expect(noSets.sources[0].links).toEqual([]);
  });
});

describe('toPopularity', () => {
  it('camel-cases the windows and keeps a missing window missing', () => {
    const p = must(show.popularity);
    const { '7d': _, ...partial } = p.windows;
    expect(toPopularity({ ...p, windows: partial as typeof p.windows })?.windows).toEqual({
      '48h': {
        plays: p.windows['48h'].plays,
        hours: p.windows['48h'].hours,
        hotScore: p.windows['48h'].hot_score,
      },
      '30d': {
        plays: p.windows['30d'].plays,
        hours: p.windows['30d'].hours,
        hotScore: p.windows['30d'].hot_score,
      },
    });
    expect(toPopularity(p)).toMatchObject({
      momentumScore: p.momentum_score,
      trendRatio: p.trend_ratio,
    });
  });

  it('is null without popularity', () => {
    expect(toPopularity(null)).toBeNull();
  });
});

const apiArtist = {
  id: 'artist_3qmp7zjbg1rpebhtyfy43096vj',
  name: 'Grateful Dead',
  slug: 'grateful-dead',
  sort_name: 'Grateful Dead',
  musicbrainz_id: null,
  featured: 1,
  show_count: 2400,
  source_count: 17000,
  popularity: null,
  created_at: '',
  updated_at: '',
  features: null,
} as unknown as Parameters<typeof toArtist>[0];

describe('toArtist', () => {
  it('keeps what the app reads', () => {
    expect(toArtist(apiArtist)).toEqual({
      id: 'artist_3qmp7zjbg1rpebhtyfy43096vj',
      name: 'Grateful Dead',
      slug: 'grateful-dead',
      sortName: 'Grateful Dead',
      featured: 1,
      showCount: 2400,
      sourceCount: 17000,
      popularity: null,
      features: undefined,
    });
  });

  it('names the artist by slug when it has no name', () => {
    expect(toArtist({ ...apiArtist, name: null })?.name).toBe('grateful-dead');
  });

  it('is null without a slug (nothing can link to it)', () => {
    expect(toArtist({ ...apiArtist, slug: null })).toBeNull();
  });

  it('decodes the features mask into camel-cased flags', () => {
    // Tours=32, Songs=4096, PerShowVenues=512, Normalization=8388608
    const features = must(toFeatures(String(32 + 512 + 4096 + 8388608)));
    expect(features).toMatchObject({
      tours: true,
      songs: true,
      perShowVenues: true,
      normalization: true,
      perSourceVenues: false,
      descriptions: false,
    });
    expect(Object.values(features).filter(Boolean)).toHaveLength(4);
  });

  it('decodes masks past 2^53 and ignores unknown bits', () => {
    const features = must(toFeatures('18446744073709551615'));
    expect(Object.values(features).every(Boolean)).toBe(true);
    // 2^63 + 1: the high bit is unknown, Descriptions (1) still decodes.
    expect(must(toFeatures('9223372036854775809')).descriptions).toBe(true);
    expect(Object.values(must(toFeatures('0'))).some(Boolean)).toBe(false);
  });

  it('has no features for a malformed or pre-mask value', () => {
    expect(toFeatures('-1')).toBeUndefined();
    expect(toFeatures('0x10')).toBeUndefined();
    expect(toFeatures({ songs: true })).toBeUndefined();
    expect(toFeatures(null)).toBeUndefined();
  });
});

describe('list conversions', () => {
  it('drops years without a year, and tours without a slug', () => {
    const year = { id: 'y', year: '1977', show_count: 60, source_count: 900, popularity: null };
    expect(toYearSummary(year as never)).toEqual({
      id: 'y',
      year: '1977',
      showCount: 60,
      sourceCount: 900,
      popularity: null,
    });
    expect(toYearSummary({ ...year, year: null } as never)).toBeNull();

    const tour = must(show.tour);
    expect(toTourSummary(tour as never)).toMatchObject({
      slug: 'spring-1977',
      name: 'Spring 1977',
      showCount: 30,
    });
    expect(toTourSummary({ ...tour, slug: null } as never)).toBeNull();
  });
});
