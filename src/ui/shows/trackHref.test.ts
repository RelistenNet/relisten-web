import { describe, expect, it } from 'vitest';
import { isShowPage } from './trackHref';

// PlayingTrackList keeps a track click on the page only where followPlayback
// will move the URL to the track; both decide with isShowPage. An unpadded
// URL that the routes accept must count, or the click plays while the URL
// stays put.
describe('isShowPage', () => {
  const date = '2024-02-08';

  it('finds the show and its tracks, padded or not, on the site and in embeds', () => {
    expect(isShowPage('/goose/2024/02/08', 'goose', date)).toBe(true);
    expect(isShowPage('/goose/2024/2/8', 'goose', date)).toBe(true);
    expect(isShowPage('/goose/2024/2/8/arcadia', 'goose', date)).toBe(true);
    expect(isShowPage('/embed/goose/2024/02/08/arcadia', 'goose', date)).toBe(true);
    expect(isShowPage('/embed-track/goose/2024/2/08/arcadia', 'goose', date)).toBe(true);
  });

  it('is false on any other page', () => {
    expect(isShowPage('/goose', 'goose', date)).toBe(false);
    expect(isShowPage('/goose/2024', 'goose', date)).toBe(false);
    expect(isShowPage('/goose/2024/02/09', 'goose', date)).toBe(false);
    expect(isShowPage('/phish/2024/02/08', 'goose', date)).toBe(false);
    expect(isShowPage('/artists/goose/shows/2024-02-08', 'goose', date)).toBe(false);
  });
});
