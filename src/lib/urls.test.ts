import { describe, expect, it } from 'vitest';
import {
  artistRecentlyAddedUrl,
  artistSongsUrl,
  artistTodayUrl,
  artistToursUrl,
  artistTopShowsUrl,
  artistUrl,
  artistVenuesUrl,
  songUrl,
  tourUrl,
  venueUrl,
} from './urls';

describe('detail page urls', () => {
  it.each([
    [artistUrl('gd'), '/artists/gd'],
    [artistSongsUrl('gd'), '/artists/gd/songs'],
    [artistVenuesUrl('gd'), '/artists/gd/venues'],
    [artistTopShowsUrl('gd'), '/artists/gd?sort=-rating'],
    [artistRecentlyAddedUrl('gd'), '/artists/gd/recently-added'],
    [artistToursUrl('gd'), '/artists/gd/tours'],
    [tourUrl('gd', 'spring-1977'), '/artists/gd/tours/spring-1977'],
    [songUrl('phish', 'tweezer-reprise'), '/artists/phish/songs/tweezer-reprise'],
    [venueUrl('barton-hall'), '/venues/barton-hall'],
    [venueUrl('barton-hall', 'gd'), '/artists/gd/venues/barton-hall'],
  ])('%s', (url, expected) => {
    expect(url).toBe(expected);
  });

  describe('artistTodayUrl', () => {
    it.each([
      [undefined, undefined, '/artists/gd/today-in-history'],
      [5, 8, '/artists/gd/today-in-history?month=5&day=8'],
      ['05', '08', '/artists/gd/today-in-history?month=5&day=8'],
      ['13', '8', '/artists/gd/today-in-history'],
      // Needs both; one alone (or an empty string) means today.
      [5, undefined, '/artists/gd/today-in-history'],
      [undefined, 8, '/artists/gd/today-in-history'],
      ['', '8', '/artists/gd/today-in-history'],
    ])('month %s, day %s → %s', (month, day, expected) => {
      expect(artistTodayUrl('gd', month, day)).toBe(expected);
    });
  });
});
