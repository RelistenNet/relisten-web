import { describe, expect, it } from 'vitest';
import { movedQuickHitUrl } from './movedSectionUrl';

// The middleware passes the path's segments (artist first) and its query.
const moved = (path: string) => {
  const url = new URL(path, 'https://relisten.net');
  const segments = url.pathname.split('/').filter(Boolean);
  return movedQuickHitUrl(segments[0], segments, url.searchParams);
};

describe('movedQuickHitUrl', () => {
  it.each([
    ['/gd/top', '/artists/gd?sort=-rating'],
    ['/gd/recently-added', '/artists/gd/recently-added'],
    ['/gd/songs', '/artists/gd/songs'],
    ['/gd/songs?slug=scarlet-begonias', '/artists/gd/songs/scarlet-begonias'],
    ['/gd/venues', '/artists/gd/venues'],
    ['/gd/venues?slug=barton-hall', '/artists/gd/venues/barton-hall'],
    ['/gd/tours', '/artists/gd/tours'],
    ['/gd/tours?slug=spring-1977', '/artists/gd/tours/spring-1977'],
  ])('%s → %s', (from, to) => {
    expect(moved(from)).toBe(to);
  });

  describe('today in history', () => {
    it.each([
      ['/gd/today-in-history', '/artists/gd/today-in-history'],
      ['/gd/today-in-history/5/8', '/artists/gd/today-in-history?month=5&day=8'],
      ['/gd/today-in-history?month=5&day=8', '/artists/gd/today-in-history?month=5&day=8'],
      // Path segments win over the query.
      ['/gd/today-in-history/5/8?month=6&day=9', '/artists/gd/today-in-history?month=5&day=8'],
      // Month and day go together: one alone is today.
      ['/gd/today-in-history/5', '/artists/gd/today-in-history'],
      ['/gd/today-in-history?month=5', '/artists/gd/today-in-history'],
    ])('%s → %s', (from, to) => {
      expect(moved(from)).toBe(to);
    });
  });

  describe('a show open in a section', () => {
    it.each([
      ['/gd/songs?slug=x&date=1977-05-08', '/gd/1977/05/08'],
      ['/gd/songs?slug=x&date=1977-05-08&track=t', '/gd/1977/05/08/t'],
      ['/gd/songs?slug=x&date=1977-05-08&track=t&source=s', '/gd/1977/05/08/t?source=s'],
      ['/gd/songs?date=1977-05-08&source=s', '/gd/1977/05/08?source=s'],
      ['/gd/venues?slug=barton-hall&date=1977-05-08&track=t', '/gd/1977/05/08/t'],
      ['/gd/tours?slug=spring-1977&date=1977-05-08', '/gd/1977/05/08'],
    ])('%s → %s', (from, to) => {
      expect(moved(from)).toBe(to);
    });

    it.each([
      ['/gd/songs?slug=x&date=1977-5-8', '/artists/gd/songs/x'],
      ['/gd/songs?slug=x&date=77-05-08', '/artists/gd/songs/x'],
      ['/gd/songs?slug=x&date=1977/05/08', '/artists/gd/songs/x'],
      ['/gd/songs?slug=x&date=1977-05-08x', '/artists/gd/songs/x'],
      ['/gd/venues?date=nope', '/artists/gd/venues'],
      ['/gd/tours?slug=t&date=', '/artists/gd/tours/t'],
    ])('ignores a malformed date: %s → %s', (from, to) => {
      expect(moved(from)).toBe(to);
    });

    it('only checks the date shape, not that it is a real date', () => {
      expect(moved('/gd/songs?date=1977-13-45')).toBe('/gd/1977/13/45');
    });

    it('ignores track and source without a date', () => {
      expect(moved('/gd/songs?slug=x&track=t&source=s')).toBe('/artists/gd/songs/x');
    });
  });

  it.each(['/gd', '/gd/1977', '/gd/1977/05/08', '/gd/1977/05/08/minglewood-blues', '/gd/topx'])(
    'is null for non-section URLs: %s',
    (path) => {
      expect(moved(path)).toBeNull();
    }
  );

  describe('untrusted query values', () => {
    it('encodes them so they cannot add query params or path segments', () => {
      expect(
        moved('/gd/songs?slug=scarlet-begonias&date=1977-05-08&track=a%2Fb&source=a%26b')
      ).toBe('/gd/1977/05/08/a%2Fb?source=a%26b');
      expect(moved('/gd/songs?slug=a%2F..%2Fb')).toBe('/artists/gd/songs/a%2F..%2Fb');
      expect(moved('/gd/venues?slug=x%3Fy')).toBe('/artists/gd/venues/x%3Fy');
      // Not a month: the date is dropped (today's page) rather than passed along.
      expect(moved('/gd/today-in-history?month=5%26x&day=8')).toBe('/artists/gd/today-in-history');
    });
  });
});
