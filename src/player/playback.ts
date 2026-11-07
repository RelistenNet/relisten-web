// ---------------------------------------------------------------------------
// Playback: what changes while a track plays, kept apart from the queue.
//
// Position changes ~60 times a second; only the scrubber and the time display
// subscribe to it. Playing/paused and the per-entry load states change rarely,
// so selectors on them re-render only when they change. The queue machine,
// and every selector on it, never sees a progress frame.
// ---------------------------------------------------------------------------

import { fromTransition } from 'xstate';
import type { LoadState } from './engine';

export type PlaybackState = {
  /** The entry the position belongs to. */
  key: string | null;
  currentTime: number;
  /** Seconds; NaN until the file's length is known. */
  duration: number;
  playing: boolean;
  /** Web Audio load state per entry key ('LOADED' means gapless-ready). */
  statuses: Record<string, LoadState>;
};

export type PlaybackEvent =
  | { type: 'PROGRESS'; key: string; currentTime: number; duration: number }
  | { type: 'PLAYING'; playing: boolean }
  | { type: 'STATUS'; statuses: Record<string, LoadState> }
  /** A restored position, shown before the entry can play. */
  | { type: 'RESTORED'; key: string; currentTime: number; duration?: number };

export const initialPlayback: PlaybackState = {
  key: null,
  currentTime: 0,
  duration: Number.NaN,
  playing: false,
  statuses: {},
};

export function playbackTransition(state: PlaybackState, event: PlaybackEvent): PlaybackState {
  switch (event.type) {
    case 'PROGRESS': {
      // Keep a known length when a frame reports NaN (HTML5 before metadata).
      const duration = Number.isFinite(event.duration)
        ? event.duration
        : event.key === state.key
          ? state.duration
          : Number.NaN;
      if (
        event.key === state.key &&
        event.currentTime === state.currentTime &&
        Object.is(duration, state.duration)
      )
        return state;
      return { ...state, key: event.key, currentTime: event.currentTime, duration };
    }
    case 'PLAYING':
      return event.playing === state.playing ? state : { ...state, playing: event.playing };
    case 'STATUS':
      return { ...state, statuses: event.statuses };
    case 'RESTORED':
      return {
        ...state,
        key: event.key,
        currentTime: event.currentTime,
        duration: event.duration ?? Number.NaN,
      };
  }
}

export const playbackLogic = fromTransition(playbackTransition, initialPlayback);
