/** A track counts as played once this much of it has actually been heard. */
export const SCROBBLE_AFTER_SECONDS = 5;

type Progress = { currentTime: number; isPaused: boolean };

/**
 * Decides when the current track has been listened to long enough to count as a
 * play. Feed it every progress update; `progress` returns true exactly once per
 * id (a queue entry key, so two queued copies of a track each count), the
 * moment it crosses the threshold.
 *
 * Heard time is real time that passed while the track was unpaused and its
 * position moved forward. Each step counts as the smaller of the two, so a seek
 * (position jumps, little time passes) adds almost nothing, and a stall or a
 * suspended AudioContext (time passes, position doesn't) adds nothing. Restoring
 * a saved position on page load is a paused seek, so it never counts.
 *
 * The first step after a pause is skipped: a seek made while paused isn't always
 * reported before playback resumes (gapless applies an HTML5 seek on
 * loadedmetadata), and the time spent paused would let that jump through.
 */
export function createListenTracker(now: () => number = () => performance.now() / 1000) {
  let current = '';
  let lastTime = 0;
  let lastAt = 0;
  let wasPaused = true;
  let heard = 0;
  let counted = false;

  return {
    progress(id: string, { currentTime, isPaused }: Progress): boolean {
      const at = now();
      if (id !== current) {
        current = id;
        heard = 0;
        counted = false;
        wasPaused = true;
      } else if (!isPaused && !wasPaused) {
        heard += Math.max(0, Math.min(currentTime - lastTime, at - lastAt));
      }
      lastTime = currentTime;
      lastAt = at;
      wasPaused = isPaused;

      if (counted || heard < SCROBBLE_AFTER_SECONDS) return false;
      counted = true;
      return true;
    },
  };
}
