import { describe, expect, it } from 'vitest';
import { showPageKind } from './trackHref';

// PlayingTrackList keeps a track click on the page only where followPlayback
// will move the URL to the track; both decide with showPageKind. An unpadded
// URL that the routes accept must count, or the click plays while the URL
// stays put.
describe('showPageKind', () => {
  const date = '2024-02-08';

  it('finds the show and its tracks, padded or not, on the site and in embeds', () => {
    expect(showPageKind('/goose/2024/02/08', 'goose', date)).toBe('show');
    expect(showPageKind('/goose/2024/2/8', 'goose', date)).toBe('show');
    expect(showPageKind('/goose/2024/2/8/arcadia', 'goose', date)).toBe('track');
    expect(showPageKind('/embed/goose/2024/02/08/arcadia', 'goose', date)).toBe('track');
    expect(showPageKind('/embed-track/goose/2024/2/08/arcadia', 'goose', date)).toBe('track');
  });

  it('is null on any other page', () => {
    expect(showPageKind('/goose', 'goose', date)).toBeNull();
    expect(showPageKind('/goose/2024', 'goose', date)).toBeNull();
    expect(showPageKind('/goose/2024/02/09', 'goose', date)).toBeNull();
    expect(showPageKind('/phish/2024/02/08', 'goose', date)).toBeNull();
    expect(showPageKind('/artists/goose/shows/2024-02-08', 'goose', date)).toBeNull();
  });
});
