import { describe, expect, it } from 'vitest';
import { must, tweezerRepriseSong } from '@/data/__fixtures__';
import { slimSongBySlug } from '@/data/songs';
import type { ShowSummary, SongDetail } from '@/domain/types';
import type { Artist } from '@/types';
import { showRow, showRows, songRows, type ArtistsById } from './showRows';

const PHISH = 'artist_6aaf982021nrst0m68ew1djerc';

const artists: ArtistsById = new Map<string, Artist>([
  ['artist_gd', { id: 'artist_gd', name: 'Grateful Dead', slug: 'grateful-dead' }],
  [PHISH, { id: PHISH, name: 'Phish', slug: 'phish' }],
  ['artist_noname', { id: 'artist_noname', slug: 'no-name' }],
  ['artist_noslug', { id: 'artist_noslug', name: 'No Slug' }],
]);

const summary = (overrides: Partial<ShowSummary> = {}): ShowSummary => ({
  id: 'show_1',
  artistId: 'artist_gd',
  date: '1977-05-08',
  venue: { name: 'Barton Hall', location: 'Ithaca, NY', slug: 'barton-hall' },
  tourName: 'Spring 1977',
  tapes: 23,
  sbd: true,
  rating: 9.5,
  plays30d: 100,
  addedAt: '2018-10-23T07:00:49Z',
  ...overrides,
});

describe('showRow', () => {
  it('joins the artist and links the show page', () => {
    expect(showRow(summary(), artists)).toEqual({
      id: 'show_1',
      showId: 'show_1',
      date: '1977-05-08',
      year: '1977',
      artistName: 'Grateful Dead',
      artistSlug: 'grateful-dead',
      venueName: 'Barton Hall',
      venueSlug: 'barton-hall',
      location: 'Ithaca, NY',
      tourName: 'Spring 1977',
      tapes: 23,
      sbd: true,
      rating: 9.5,
      plays30d: 100,
      addedAt: '2018-10-23T07:00:49Z',
      href: '/grateful-dead/1977/05/08',
    });
  });

  it('names the artist by slug when it has no name', () => {
    expect(showRow(summary({ artistId: 'artist_noname' }), artists)).toMatchObject({
      artistName: 'no-name',
      href: '/no-name/1977/05/08',
    });
  });

  it('is null for an unknown artist, or one without a slug', () => {
    expect(showRow(summary({ artistId: 'artist_missing' }), artists)).toBeNull();
    expect(showRow(summary({ artistId: 'artist_noslug' }), artists)).toBeNull();
  });

  it('leaves venue fields empty without a venue', () => {
    const row = must(showRow(summary({ venue: undefined }), artists));
    expect(row.venueName).toBeUndefined();
    expect(row.venueSlug).toBeUndefined();
    expect(row.location).toBeUndefined();
  });
});

describe('showRows', () => {
  it('skips rows whose artist is unknown, keeping order', () => {
    const rows = showRows(
      [
        summary({ id: 'a' }),
        summary({ id: 'b', artistId: 'artist_missing' }),
        summary({ id: 'c', artistId: PHISH, date: '1997-11-22' }),
      ],
      artists
    );
    expect(rows.map((r) => [r.id, r.href])).toEqual([
      ['a', '/grateful-dead/1977/05/08'],
      ['c', '/phish/1997/11/22'],
    ]);
  });
});

describe('songRows', () => {
  const song = slimSongBySlug(tweezerRepriseSong, PHISH, 'tweezer-reprise');
  const rows = songRows(song, artists);

  it('has a row per performance with a unique id', () => {
    expect(rows).toHaveLength(song.performances.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it('ids a single performance by its show, repeats by show and track', () => {
    const once = must(rows.find((r) => r.date === '1991-02-01'));
    expect(once.id).toBe(once.showId);
    expect(once.performance).toBeUndefined();

    const spac = rows.filter((r) => r.date === '2025-07-27');
    expect(spac.map((r) => r.id)).toEqual(
      spac.map((r) => `show_3gx78d1a8jfge00xymq0y20073:${r.track?.id}`)
    );
    expect(spac.map((r) => r.performance)).toEqual(
      [1, 2, 3, 4, 5, 6].map((index) => ({ index, of: 6 }))
    );
  });

  it('carries the performance onto the row', () => {
    const segue = must(rows.find((r) => r.date === '2016-12-28'));
    expect(segue).toMatchObject({
      artistSlug: 'phish',
      href: '/phish/2016/12/28',
      trackTitle: 'Martian Monster > Tweezer Reprise Jam > Martian Monster',
      songDuration: 587,
      songDurationApprox: true,
      track: { id: 'track_71wcpe5t9432aaaqsar054k84p', duration: 587 },
    });
  });

  it('skips performances whose artist is unknown', () => {
    expect(songRows(song, new Map())).toEqual([]);
  });

  it('leaves track fields empty for a performance without a file', () => {
    const bare: SongDetail = {
      ...song,
      performances: [{ show: summary(), duration: null, durationApprox: false }],
    };
    expect(songRows(bare, artists)[0]).toMatchObject({
      id: 'show_1',
      track: undefined,
      trackTitle: undefined,
      songDuration: null,
      songDurationApprox: false,
      performance: undefined,
    });
  });
});
