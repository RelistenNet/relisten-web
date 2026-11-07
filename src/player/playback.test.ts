import { describe, expect, it } from 'vitest';
import { initialPlayback, playbackTransition } from './playback';

describe('playback volume', () => {
  it('keeps zero (muted)', () => {
    expect(playbackTransition(initialPlayback, { type: 'VOLUME', volume: 0 }).volume).toBe(0);
  });

  it('clamps, and ignores non-numbers', () => {
    expect(playbackTransition(initialPlayback, { type: 'VOLUME', volume: 2 }).volume).toBe(1);
    const half = playbackTransition(initialPlayback, { type: 'VOLUME', volume: 0.5 });
    expect(playbackTransition(half, { type: 'VOLUME', volume: Number.NaN }).volume).toBe(0.5);
  });

  it('returns the same state when nothing changes (no re-render)', () => {
    const half = playbackTransition(initialPlayback, { type: 'VOLUME', volume: 0.5 });
    expect(playbackTransition(half, { type: 'VOLUME', volume: 0.5 })).toBe(half);
  });
});
