import { describe, expect, it } from 'vitest';
import { formatAgo } from '@/components/TimeAgo';
import { formatListeners, nextRevealAt, toMonthDay, type LivePlay } from './live';

const play = (id: number, playedAt: number): LivePlay => ({
  id,
  playedAt,
  trackTitle: 't',
  trackSlug: 't',
  sourceId: 1,
  displayDate: '1977-05-08',
  artistName: 'Grateful Dead',
  artistSlug: 'grateful-dead',
});

describe('nextRevealAt', () => {
  // Newest first, as the feed stores them.
  const plays = [play(3, 3_000), play(2, 2_000), play(1, 1_000)];

  it('is the oldest unrevealed play plus the lag', () => {
    expect(nextRevealAt(plays, 1_000, 15_000)).toBe(2_000 + 15_000);
  });

  it('is null when everything is revealed', () => {
    expect(nextRevealAt(plays, 3_000, 15_000)).toBeNull();
  });

  it('starts from the oldest play when nothing is revealed', () => {
    expect(nextRevealAt(plays, 0, 15_000)).toBe(1_000 + 15_000);
  });
});

describe('formatting', () => {
  it('toMonthDay pads to MM-DD', () => {
    expect(toMonthDay({ month: 11, day: 3 })).toBe('11-03');
  });

  it('formatListeners keeps a real zero but floors artist rows at ~1', () => {
    expect(formatListeners(0)).toBe('0');
    expect(formatListeners(0.2, { min: 1 })).toBe('~1');
    expect(formatListeners(1234.4)).toBe('~1,234');
  });

  it('formatAgo switches to minutes after a minute', () => {
    expect(formatAgo(59_999)).toBe('59s');
    expect(formatAgo(60_000)).toBe('1m');
    expect(formatAgo(-500)).toBe('0s');
  });
});
