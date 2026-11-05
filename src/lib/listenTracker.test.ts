import { describe, expect, it } from 'vitest';
import { createListenTracker } from './listenTracker';

/** A tracker on a fake clock, plus a helper that advances it and reports progress. */
function setup() {
  let clock = 0;
  const tracker = createListenTracker(() => clock);
  return (uuid: string, advance: number, currentTime: number, isPaused = false) => {
    clock += advance;
    return tracker.progress(uuid, { currentTime, isPaused });
  };
}

/** Plays `uuid` in 0.1s frames from `from` to `to`; returns whether any frame counted. */
function play(step: ReturnType<typeof setup>, uuid: string, from: number, to: number) {
  let counted = false;
  for (let t = from; t <= to + 1e-9; t += 0.1) counted = step(uuid, 0.1, t) || counted;
  return counted;
}

describe('createListenTracker', () => {
  it('counts a play after 5 seconds of listening, once', () => {
    const step = setup();
    expect(play(step, 'a', 0, 4.8)).toBe(false);
    expect(play(step, 'a', 4.9, 5.3)).toBe(true);
    expect(play(step, 'a', 5.4, 30)).toBe(false);
  });

  it('ignores a paused restore to a saved position', () => {
    const step = setup();
    expect(step('a', 0, 0, true)).toBe(false);
    expect(step('a', 0.01, 120, true)).toBe(false);
    expect(step('a', 10, 120, true)).toBe(false);
  });

  it('does not count a seek as listening', () => {
    const step = setup();
    play(step, 'a', 0, 2);
    expect(step('a', 0.1, 200)).toBe(false); // seek 198s forward in one frame
    expect(play(step, 'a', 200.1, 202.5)).toBe(false); // ~2.5s + ~2s heard
    expect(play(step, 'a', 202.6, 204)).toBe(true);
  });

  it('skips the jump from a seek reported late, after a long pause', () => {
    const step = setup();
    step('a', 0, 10, true);
    // Paused for 5 minutes; the seek to 100s first shows up once playback resumes.
    expect(step('a', 300, 100)).toBe(false);
    expect(play(step, 'a', 100.1, 104)).toBe(false);
  });

  it('does not count time while the position is stuck', () => {
    const step = setup();
    step('a', 0, 0);
    for (let i = 0; i < 100; i++) expect(step('a', 0.1, 0)).toBe(false);
  });

  it('counts a background tab as listening', () => {
    const step = setup();
    play(step, 'a', 0, 1);
    // rAF stopped for 30s while playing; the next frame catches up.
    expect(step('a', 30, 31)).toBe(true);
  });

  it('starts over on a new track', () => {
    const step = setup();
    play(step, 'a', 0, 4);
    expect(play(step, 'b', 0, 4)).toBe(false);
    expect(play(step, 'b', 4.1, 6)).toBe(true);
  });
});
