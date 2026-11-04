/**
 * One shared clock that ticks on wall-clock second boundaries, for
 * `useSyncExternalStore`. It only runs while something is subscribed, and
 * every subscriber updates on the same tick, so ten "12s ago" labels cost one
 * timer and re-render only themselves.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let current = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const wallSecond = () => Math.floor(Date.now() / 1000);
const untilNextSecond = () => 1000 - (Date.now() % 1000);

function tick() {
  current = wallSecond();
  for (const listener of listeners) listener();
  timer = setTimeout(tick, untilNextSecond());
}

export const secondsClock = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    if (listeners.size === 1) {
      current = wallSecond();
      timer = setTimeout(tick, untilNextSecond());
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) clearTimeout(timer);
    };
  },

  /** The current Unix second; stable between ticks while subscribed. */
  getSnapshot() {
    // Before the first subscriber the clock isn't running, so read the wall clock.
    if (listeners.size === 0) current = wallSecond();
    return current;
  },
};
