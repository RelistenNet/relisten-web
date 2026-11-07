import { describe, expect, it } from 'vitest';
import type { SongWithShowsResource } from '@/api/generated/model';
import { slimSongBySlug } from './songs';
import { must, tweezerRepriseSong as song } from './__fixtures__';

// Four shows; see __fixtures__/index.ts.
type Entry = NonNullable<SongWithShowsResource['shows']>[number];
const entry = (date: string) =>
  must(
    song.shows?.find((e) => e.show.display_date === date),
    date
  );

const slim = (s: SongWithShowsResource = song) => slimSongBySlug(s, s.artist_id, 'url-slug');
const performances = (date: string) => slim().performances.filter((p) => p.show.date === date);
const only = (e: Entry) => slim({ ...song, shows: [e] }).performances;

describe('slimSongBySlug', () => {
  it('keeps the song', () => {
    const { performances: _, ...rest } = slim();
    expect(rest).toEqual({
      id: 'song_699vmgsp',
      slug: 'tweezer-reprise',
      name: 'Tweezer Reprise',
      originalArtist: undefined,
      aliases: [],
      imported: false,
    });
  });

  it('falls back to the URL slug and a placeholder name', () => {
    const s = slim({ ...song, slug: null, name: null, shows: [] });
    expect(s.slug).toBe('url-slug');
    expect(s.name).toBe('Unknown song');
  });

  it('has a row per performance, in show order', () => {
    expect(slim().performances.map((p) => p.show.date)).toEqual([
      '1991-02-01',
      '1999-12-08',
      '1999-12-08',
      '2016-12-28',
      ...Array(6).fill('2025-07-27'),
    ]);
  });

  it('played once: one row with the median timing', () => {
    expect(performances('1991-02-01')).toEqual([
      {
        show: expect.objectContaining({
          id: 'show_2fpfvpfqwqxavn6qv4fk471hsg',
          date: '1991-02-01',
        }),
        track: {
          id: 'track_5782nxm37y2yx8s0rea3csydcd',
          title: 'Tweezer Reprise',
          slug: 'tweezer-reprise-8491',
          mp3Url: 'https://phish.in/blob/hokzg6bbrlmgacirsesaw4rirgr4.mp3',
          duration: 198,
          sourceId: 'source_42ys520m7w22f9fmcvs0s9r0kp',
        },
        duration: 198,
        durationApprox: false,
      },
    ]);
  });

  it('played once: prefers the single-song median over a multi-song one', () => {
    const e = entry('1991-02-01');
    const [p] = only({
      ...e,
      timings: {
        single_song: { source_count: 1, min: 200, max: 200, avg: 200, median: 200 },
        multi_song: { source_count: 1, min: 900, max: 900, avg: 900, median: 900 },
      },
    });
    expect(p.duration).toBe(200);
    expect(p.durationApprox).toBe(false);
  });

  it('only inside multi-song files: the multi-song median, marked approximate', () => {
    const [p, ...rest] = performances('2016-12-28');
    expect(rest).toEqual([]);
    expect(p.duration).toBe(587);
    expect(p.durationApprox).toBe(true);
    expect(p.repeat).toBeUndefined();
    expect(p.track?.title).toBe('Martian Monster > Tweezer Reprise Jam > Martian Monster');
  });

  it('played several times: a row per file, with its own length and which time it was', () => {
    const spac = performances('2025-07-27');
    expect(spac.map((p) => p.track?.slug)).toEqual([
      'tweezer-reprise-40498',
      'tweezer-reprise-2-40500',
      'tweezer-reprise-3-40503',
      'tweezer-reprise-4-40507',
      'tweezer-reprise-5-40511',
      'tweezer-reprise-6-40514',
    ]);
    expect(spac.map((p) => p.duration)).toEqual([783, 183, 73, 180, 1383, 180]);
    expect(spac.map((p) => p.repeat)).toEqual(
      [1, 2, 3, 4, 5, 6].map((index) => ({ index, of: 6 }))
    );
    expect(spac.every((p) => !p.durationApprox)).toBe(true);
    // Every row is the same show.
    expect(new Set(spac.map((p) => p.show.id))).toEqual(
      new Set(['show_3gx78d1a8jfge00xymq0y20073'])
    );
  });

  it('played twice with a segue: each file keeps its own length', () => {
    const rows = performances('1999-12-08');
    expect(rows.map((p) => [p.track?.title, p.duration, p.repeat])).toEqual([
      ['YEM > Tweezer Reprise', 1285, { index: 1, of: 2 }],
      ['Tweezer Reprise', 270, { index: 2, of: 2 }],
    ]);
    // durationApprox is per show (some tape has a single-song file), so the
    // segue file's length isn't marked approximate.
    expect(rows.map((p) => p.durationApprox)).toEqual([false, false]);
  });

  it('a show with no files still gets a row, without a track', () => {
    const [p] = only({ ...entry('1991-02-01'), tracks: [] });
    expect(p.track).toBeUndefined();
    expect(p.duration).toBe(198);
    expect(only({ ...entry('1991-02-01'), tracks: undefined })[0].track).toBeUndefined();
  });

  it('no timings: no duration', () => {
    const [p] = only({ ...entry('1991-02-01'), timings: { single_song: null, multi_song: null } });
    expect(p.duration).toBeNull();
    expect(p.durationApprox).toBe(false);
  });

  it('fills in missing file fields', () => {
    const e = entry('1991-02-01');
    const file = { ...must(e.tracks?.[0]), title: null, slug: null, mp3_url: null };
    expect(only({ ...e, tracks: [file] })[0].track).toMatchObject({
      title: 'Tweezer Reprise',
      slug: '',
      mp3Url: null,
    });
  });

  it('skips shows without a date', () => {
    const e = entry('1991-02-01');
    expect(only({ ...e, show: { ...e.show, display_date: null } })).toEqual([]);
  });

  it('is empty without shows', () => {
    expect(slim({ ...song, shows: null }).performances).toEqual([]);
  });
});
