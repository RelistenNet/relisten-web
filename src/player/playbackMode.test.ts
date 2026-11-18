import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { savedPlaybackSettings, savePlaybackSettings } from './playbackMode';

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('savedPlaybackSettings', () => {
  it('round-trips what was saved', () => {
    savePlaybackSettings({ mode: 'preload-1', forceGaplessOnMobile: true });
    expect(savedPlaybackSettings()).toEqual({ mode: 'preload-1', forceGaplessOnMobile: true });
  });

  it('falls back per field, keeping the valid ones', () => {
    store.set(
      'playbackSettings',
      JSON.stringify({ mode: 'renamed-mode', forceGaplessOnMobile: true })
    );
    expect(savedPlaybackSettings()).toEqual({ mode: 'auto', forceGaplessOnMobile: true });
  });

  it.each([
    ['nothing saved', undefined],
    ['not JSON', '{oops'],
    ['not an object', '"auto"'],
    ['null', 'null'],
  ])('gives the defaults for %s', (_, raw) => {
    if (raw !== undefined) store.set('playbackSettings', raw);
    expect(savedPlaybackSettings()).toEqual({ mode: 'auto', forceGaplessOnMobile: false });
  });
});
