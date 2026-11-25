import { describe, expect, it } from 'vitest';
import { excerptRuns, performanceHref, toSearchResults } from './search';

describe('excerptRuns', () => {
  it('splits highlights into matched and plain runs', () => {
    expect(excerptRuns('<mark>Dark</mark> <mark>Star</mark> Rough but nice')).toEqual([
      { text: 'Dark', match: true },
      { text: ' ', match: false },
      { text: 'Star', match: true },
      { text: ' Rough but nice', match: false },
    ]);
  });

  it('keeps markup out of the text and decodes entities', () => {
    expect(excerptRuns('<b onclick="x">AUD</b> &amp; <mark>SBD</mark><script>')).toEqual([
      { text: 'AUD & ', match: false },
      { text: 'SBD', match: true },
    ]);
  });

  it('is undefined for nothing to show', () => {
    expect(excerptRuns(undefined)).toBeUndefined();
    expect(excerptRuns('<br>')).toBeUndefined();
  });
});

describe('performanceHref', () => {
  it('links to the track on the recording the preview comes from', () => {
    expect(
      performanceHref('phish', '2013-07-31', { slug: 'tweezer-27717', source_id: 'source_abc' })
    ).toBe('/phish/2013/07/31/tweezer-27717?source=abc');
  });

  it('links to the show on that recording when the preview has no slug', () => {
    expect(performanceHref('phish', '2013-07-31', { source_id: 'source_abc' })).toBe(
      '/phish/2013/07/31?source=abc'
    );
  });
});

describe('toSearchResults', () => {
  // Trimmed from accounts.relisten.net/v1/search?q=grateful+dead.
  const merged = {
    availability: { catalog: 'full', playlists: 'full' },
    counts: { shows: 3 },
    count_lower_bounds: { playlists: 2 },
    readings: { applied: { id: 'query', chips: [] }, alternatives: [] },
    next_page: null,
    results: [
      {
        kind: 'artist',
        key: 'artist:artist_3qmp',
        artist: { slug: 'grateful-dead', name: 'Grateful Dead' },
      },
      {
        kind: 'playlist',
        key: 'playlist:playlist_2xxb',
        playlist: {
          id: 'playlist_2xxb',
          name: 'Grateful Dead – Jam Vehicles',
          track_count: 259,
          owned: false,
          public_code: 'dd8fe8bea16ae7c88051fce53919a92d',
          curator: 'alecgorge',
        },
      },
      {
        kind: 'recording',
        key: 'recording:source_7bbw',
        artist: { slug: 'grateful-dead', name: 'Grateful Dead' },
        show: { display_date: '1977-05-08' },
        source: { id: 'source_7bbw', is_soundboard: true },
      },
      { kind: 'tour', key: 'tour:tour_1cr6', tour: { name: 'Spring 1977' } },
    ],
  };

  it('links a playlist row to its public page, ranked with the catalog rows', () => {
    const results = toSearchResults(merged, 'all');
    expect(results.top.map((h) => h.kind)).toEqual(['artist', 'playlist']);
    expect(results.top[1]).toMatchObject({
      title: 'Grateful Dead – Jam Vehicles',
      detail: ['alecgorge', '259 tracks'],
      href: '/playlists/dd8fe8bea16ae7c88051fce53919a92d',
    });
    expect(results.recordings.map((h) => h.href)).toEqual([
      '/grateful-dead/1977/05/08?source=7bbw',
    ]);
  });

  it('shows exact counts only, and no next page when the API has none', () => {
    const results = toSearchResults(merged, 'all');
    expect(results.counts).toEqual({ shows: 3 });
    expect(results.nextPage).toBeUndefined();
  });

  it('throws when the part of search the scope needs is unavailable', () => {
    const playlistsDown = {
      ...merged,
      availability: { catalog: 'full', playlists: 'unavailable' },
    };
    expect(() => toSearchResults(playlistsDown, 'playlists')).toThrow();
    expect(toSearchResults(playlistsDown, 'all').availability).toBe('full');

    const catalogDown = { ...merged, availability: { catalog: 'unavailable', playlists: 'full' } };
    expect(() => toSearchResults(catalogDown, 'all')).toThrow();
  });
});
