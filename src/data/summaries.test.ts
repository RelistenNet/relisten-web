import { describe, expect, it } from 'vitest';
import { toShowSummaries, toShowSummary } from './summaries';
import { gd770508 as show, must } from './__fixtures__';

describe('toShowSummary', () => {
  it('slims an API show', () => {
    expect(toShowSummary(show)).toEqual({
      id: 'show_0g9jbeawcz6sqvebcdadr9s070',
      artistId: 'artist_3qmp7zjbg1rpebhtyfy43096vj',
      date: '1977-05-08',
      venue: { name: 'Barton Hall', location: 'Ithaca, NY', slug: 'barton-hall' },
      tourName: 'Spring 1977',
      tapes: 23,
      sbd: true,
      rating: 9.56701,
      plays30d: must(show.popularity).windows['30d'].plays,
      addedAt: '2018-10-23T07:00:49.513477Z',
    });
  });

  it('is null without a display date', () => {
    expect(toShowSummary({ ...show, display_date: null })).toBeNull();
  });

  it('drops the "Not Part of a Tour" placeholder', () => {
    expect(
      toShowSummary({ ...show, tour: { ...must(show.tour), name: 'Not Part of a Tour' } })?.tourName
    ).toBeUndefined();
    expect(toShowSummary({ ...show, tour: null })?.tourName).toBeUndefined();
  });

  it('has no rating when nothing is rated, and no plays without popularity', () => {
    const s = toShowSummary({ ...show, avg_rating: 0, popularity: null });
    expect(s?.rating).toBeNull();
    expect(s?.plays30d).toBe(0);
  });

  it('has no venue when the show has none', () => {
    expect(
      toShowSummary({ ...show, artist_venue: null, imported_venue: null })?.venue
    ).toBeUndefined();
  });
});

describe('toShowSummaries', () => {
  it('skips shows without a date', () => {
    const other = { ...show, id: 'show_2', display_date: '1977-05-09' };
    expect(
      toShowSummaries([show, { ...show, display_date: null }, other]).map((s) => s.id)
    ).toEqual(['show_0g9jbeawcz6sqvebcdadr9s070', 'show_2']);
  });

  it('is empty for nothing', () => {
    expect(toShowSummaries(null)).toEqual([]);
    expect(toShowSummaries(undefined)).toEqual([]);
  });
});
