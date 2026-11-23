import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrobblePlay } from './scrobble';

const sent = () => JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));

describe('scrobblePlay', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response()))
    );

  it('sends the playlist a play started from', () => {
    stub();
    scrobblePlay('track_1', 'playlist_2xxbrj4z66fx0a0mk8paz6em6v');
    expect(sent()).toEqual({
      track_id: 'track_1',
      app_type: 'web',
      playlist_id: 'playlist_2xxbrj4z66fx0a0mk8paz6em6v',
    });
  });

  it('drops a playlist id the endpoint would refuse the play for', () => {
    stub();
    scrobblePlay('track_1', 'dd8fe8bea16ae7c88051fce53919a92d'); // a share code, not an id
    expect(sent()).toEqual({ track_id: 'track_1', app_type: 'web' });
  });
});
