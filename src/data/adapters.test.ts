import { describe, expect, it } from 'vitest';
import type { VenueResource } from '@/api/generated/model';
import { showVenue, toTape, toTrack, venueLocation } from './adapters';
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
      id: 'venue_bvhfka1g',
      name: 'Barton Hall',
      location: 'Ithaca, NY',
      slug: 'barton-hall',
      latitude: null,
      longitude: null,
    });
  });

  it('falls back to the imported venue, linked by its id (not its slug)', () => {
    expect(showVenue({ artist_venue: null, imported_venue: show.imported_venue })).toEqual({
      id: 'imported_venue_19z7vw041a93fmvx8370hnc6g9',
      name: 'Barton Hall, Cornell University',
      location: 'Ithaca, NY, USA',
      slug: 'imported_venue_19z7vw041a93fmvx8370hnc6g9',
      latitude: null,
      longitude: null,
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
      source_id: 'source_7bbw2e16a0h9ssczd3bwzgv1wp',
      track_position: 1,
      duration: 381,
      title: 'Minglewood Blues',
      slug: 'minglewood-blues',
      mp3_url:
        'https://archive.org/download/gd77-05-08.sbd.hicks.4982.sbeok.shnf/gd77-05-08eaton-d1t01.mp3',
      flac_url: null,
    });
  });

  it('turns null strings into undefined', () => {
    const t = toTrack({ ...firstTrack, title: null, slug: null });
    expect(t.title).toBeUndefined();
    expect(t.slug).toBeUndefined();
  });
});

describe('toTape', () => {
  const tape = toTape(show);

  it('carries the show', () => {
    expect(tape).toMatchObject({
      id: 'show_0g9jbeawcz6sqvebcdadr9s070',
      artist_id: 'artist_3qmp7zjbg1rpebhtyfy43096vj',
      display_date: '1977-05-08',
      source_count: 23,
      has_soundboard_source: true,
      venue: { id: 'venue_bvhfka1g', slug: 'barton-hall', location: 'Ithaca, NY' },
      tour: { name: 'Spring 1977', slug: 'spring-1977', shows_on_tour: 30 },
      year: { id: 'year_6be0p5zv0g67nkdka2x9yxa312', year: '1977' },
    });
    expect(tape.popularity?.windows?.['30d']?.plays).toBe(
      must(show.popularity).windows['30d'].plays
    );
  });

  it('converts tapes, sets, tracks, and links', () => {
    const sources = must(tape.sources);
    expect(sources.map((s) => s.id)).toEqual([
      'source_7bbw2e16a0h9ssczd3bwzgv1wp',
      'source_44hnyeravdzbq7cree9ayhhjr1',
    ]);
    const [first] = sources;
    const sets = must(first.sets);
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ index: 0, is_encore: false, name: 'Set' });
    expect(sets[0].tracks?.map((t) => t.title)).toEqual(['Minglewood Blues', 'Loser']);
    // v4 links have no id; the url stands in.
    expect(first.links).toEqual([
      {
        id: 'https://archive.org/details/gd77-05-08.sbd.hicks.4982.sbeok.shnf',
        source_id: 'source_7bbw2e16a0h9ssczd3bwzgv1wp',
        for_reviews: true,
        for_ratings: true,
        for_source: true,
        url: 'https://archive.org/details/gd77-05-08.sbd.hicks.4982.sbeok.shnf',
        label: 'View on archive.org',
      },
    ]);
  });

  it('handles missing pieces', () => {
    const bare = toTape({
      ...show,
      display_date: null,
      tour: null,
      year: null,
      sources: null,
      artist_venue: null,
      imported_venue: null,
    });
    expect(bare.display_date).toBeUndefined();
    expect(bare.tour).toBeUndefined();
    expect(bare.year).toBeUndefined();
    expect(bare.venue).toBeUndefined();
    expect(bare.sources).toEqual([]);

    const noSets = toTape({ ...show, sources: [{ ...firstSource, sets: null, links: null }] });
    expect(noSets.sources?.[0].sets).toEqual([]);
    expect(noSets.sources?.[0].links).toEqual([]);
  });
});
