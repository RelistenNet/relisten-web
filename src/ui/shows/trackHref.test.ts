import { describe, expect, it } from 'vitest';
import { showPageRoute } from './trackHref';

// PlayingTrackList keeps a track click on the page only where followPlayback
// will move the URL to the track; both decide with showPageRoute. An unpadded
// URL that the routes accept must count, or the click plays while the URL
// stays put.
describe('showPageRoute', () => {
  const date = '2024-02-08';

  it('finds the show and its tracks, padded or not, on the site and in embeds', () => {
    expect(showPageRoute('/goose/2024/02/08', 'goose', date)).toBe('site');
    expect(showPageRoute('/goose/2024/2/8', 'goose', date)).toBe('site');
    expect(showPageRoute('/goose/2024/2/8/arcadia', 'goose', date)).toBe('site');
    expect(showPageRoute('/embed/goose/2024/02/08/arcadia', 'goose', date)).toBe('embed');
    expect(showPageRoute('/embed-track/goose/2024/2/08/arcadia', 'goose', date)).toBe(
      'embed-track'
    );
  });

  it('is false on any other page', () => {
    expect(showPageRoute('/goose', 'goose', date)).toBeUndefined();
    expect(showPageRoute('/goose/2024', 'goose', date)).toBeUndefined();
    expect(showPageRoute('/goose/2024/02/09', 'goose', date)).toBeUndefined();
    expect(showPageRoute('/phish/2024/02/08', 'goose', date)).toBeUndefined();
    expect(showPageRoute('/artists/goose/shows/2024-02-08', 'goose', date)).toBeUndefined();
    // An admin tool that takes a show's params is not the show's page.
    expect(showPageRoute('/admin/clip/goose/2024/02/08/arcadia', 'goose', date)).toBeUndefined();
  });
});
