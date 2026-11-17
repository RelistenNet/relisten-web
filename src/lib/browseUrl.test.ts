import { describe, expect, it } from 'vitest';
import { parseBrowseUrl } from './browseUrl';

const gd = { artistSlug: 'grateful-dead' };

describe('parseBrowseUrl', () => {
  it('names the same show from the canonical path and from a quick-hit tab', () => {
    const canonical = parseBrowseUrl(
      { ...gd, year: '1977', month: '05', day: '08', songSlug: 'scarlet-begonias' },
      {}
    );
    const quickHit = parseBrowseUrl(
      { ...gd, year: 'songs' },
      { slug: 'scarlet-begonias', date: '1977-05-08', track: 'scarlet-begonias' }
    );

    expect(canonical).toMatchObject({ kind: 'show', track: 'scarlet-begonias' });
    expect(quickHit).toMatchObject({ kind: 'show', segment: 'songs', track: 'scarlet-begonias' });
    if (canonical.kind !== 'show' || quickHit.kind !== 'show') throw new Error('unreachable');
    expect(quickHit.date).toEqual(canonical.date);
  });

  it('keeps undated shows (x in month/day) reachable', () => {
    expect(parseBrowseUrl({ ...gd, year: '1969', month: 'xx', day: 'xx' }, {})).toMatchObject({
      kind: 'show',
      date: { display: '1969-xx-xx' },
    });
  });

  it('treats a quick-hit tab without a date as the list, not a show', () => {
    expect(parseBrowseUrl({ ...gd, year: 'songs' }, { slug: 'althea' })).toEqual({
      kind: 'quick-hit',
      ...gd,
      segment: 'songs',
      slug: 'althea',
    });
    expect(parseBrowseUrl({ ...gd, year: 'top' }, {})).toMatchObject({ kind: 'quick-hit' });
  });

  it.each([
    ['a non-year, non-tab segment', { ...gd, year: 'not-a-year' }, {}],
    ['a track with no show date', { ...gd, year: 'songs' }, { slug: 'althea', track: 'althea' }],
    ['a malformed quick-hit date', { ...gd, year: 'songs' }, { date: '1977-5-8' }],
    ['a date-shaped garbage value', { ...gd, year: 'songs' }, { date: '19x7-05-08' }],
  ])('rejects %s', (_label, params, search) => {
    expect(parseBrowseUrl(params, search)).toEqual({ kind: 'invalid' });
  });

  it('passes the artist, year and today-in-history views through', () => {
    expect(parseBrowseUrl(gd, {})).toEqual({ kind: 'artist', ...gd });
    expect(parseBrowseUrl({ ...gd, year: '1977' }, {})).toEqual({
      kind: 'year',
      ...gd,
      year: '1977',
    });
    expect(parseBrowseUrl({ ...gd, year: 'today-in-history' }, {})).toEqual({
      kind: 'today-in-history',
      ...gd,
    });
  });
});
