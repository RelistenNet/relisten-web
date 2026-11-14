import { describe, expect, it } from 'vitest';
import { savedVolume } from './volume';

const storage = (value: string | null) => ({ getItem: () => value });

describe('savedVolume', () => {
  it('keeps a saved zero (muted), not the default', () => {
    expect(savedVolume(storage('0'))).toBe(0);
  });

  it('reads a saved volume', () => {
    expect(savedVolume(storage('0.35'))).toBe(0.35);
  });

  it('defaults when nothing is saved, or it is unreadable', () => {
    expect(savedVolume(storage(null))).toBe(1);
    expect(savedVolume(storage(''))).toBe(1);
    expect(savedVolume(storage('loud'))).toBe(1);
    expect(savedVolume(undefined)).toBe(1);
    expect(
      savedVolume({
        getItem: () => {
          throw new Error('denied');
        },
      })
    ).toBe(1);
  });

  it('clamps to 0–1', () => {
    expect(savedVolume(storage('3'))).toBe(1);
    expect(savedVolume(storage('-1'))).toBe(0);
  });
});
