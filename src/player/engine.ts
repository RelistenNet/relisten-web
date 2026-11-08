// ---------------------------------------------------------------------------
// The engine: the one place that talks to gapless.
//
// The player machine holds the queue; the engine makes gapless match it.
// sync() is safe to repeat: gapless reconciles by key, so unchanged entries
// cost nothing and the playing one is never interrupted. When gapless moves
// on by itself (a track ends, the OS media keys skip), onAdvanced reports the
// new key so the machine can record it. The engine's own jumps don't echo.
//
// Nothing is downloaded until audio plays: gapless starts with preloading
// off (create it with preloadNumTracks: 0), and the engine turns preloading on
// at the first progress frame that is actually playing. So a page that loads
// paused (or a crawler that renders it) fetches no audio.

import type { Entry, QueueChange, TrackInfo, TrackMetadata, WebAudioLoadingState } from 'gapless';

export type EngineEntry = { key: string; url: string; metadata: TrackMetadata };

export type LoadState = WebAudioLoadingState;

export type EngineCallbacks = {
  /** gapless made `key` current by itself. */
  onAdvanced(key: string): void;
  /** ~60 fps while playing, and once on pause. */
  onProgress(p: { key: string; currentTime: number; duration: number; isPaused: boolean }): void;
  /** Whether the queue is playing, whenever that changes. */
  onPlayingChange(playing: boolean): void;
  /** Web Audio load state per entry key, whenever any changes. */
  onStatus(statuses: Record<string, LoadState>): void;
  onError(error: Error): void;
  onPlayBlocked(): void;
};

/** The parts of gapless's Queue the engine uses (a fake in tests). */
export type QueueLike = {
  setEntries(
    entries: readonly Entry[],
    opts?: { startKey?: string; startTime?: number; play?: boolean }
  ): void;
  goto(key: string, opts?: { play?: boolean; startTime?: number }): void;
  onChange(listener: (change: QueueChange) => void): () => void;
  play(): void;
  pause(): void;
  next(): void;
  previous(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  resumeAudioContext(): Promise<void>;
  destroy(): void;
  readonly keys: string[];
  readonly currentKey: string | null;
  readonly isPlaying: boolean;
  /** Tracks gapless downloads ahead of the current one (0 = none). */
  preloadNumTracks: number;
  readonly tracks: readonly TrackInfo[];
};

export type QueueFactory = (callbacks: {
  onProgress(info: TrackInfo): void;
  onError(error: Error): void;
  onPlayBlocked(): void;
}) => QueueLike;

export type SyncInput = {
  entries: EngineEntry[];
  currentKey: string | null;
};

const STATUS_INTERVAL_MS = 250;

/** Tracks to preload ahead once audio is playing (gapless starts with none). */
export const PRELOAD_TRACKS_WHILE_PLAYING = 2;

export function createEngine(createQueue: QueueFactory, callbacks: EngineCallbacks) {
  let lastStatus = '';
  let lastStatusAt = 0;
  let playing = false;

  const reportPlaying = () => {
    if (queue.isPlaying !== playing) {
      playing = queue.isPlaying;
      callbacks.onPlayingChange(playing);
    }
  };

  const reportStatus = (force = false) => {
    const now = Date.now();
    if (!force && now - lastStatusAt < STATUS_INTERVAL_MS) return;
    lastStatusAt = now;
    const statuses: Record<string, LoadState> = {};
    for (const t of queue.tracks) statuses[t.key] = t.webAudioLoadingState;
    const serialized = JSON.stringify(statuses);
    if (serialized === lastStatus) return;
    lastStatus = serialized;
    callbacks.onStatus(statuses);
  };

  const queue = createQueue({
    onProgress(info) {
      if (!info.isPaused && queue.preloadNumTracks === 0) {
        queue.preloadNumTracks = PRELOAD_TRACKS_WHILE_PLAYING;
      }
      callbacks.onProgress({
        key: info.key,
        currentTime: info.currentTime,
        duration: info.duration,
        isPaused: info.isPaused,
      });
      reportPlaying();
      reportStatus();
    },
    onError: (e) => callbacks.onError(e),
    onPlayBlocked: () => {
      reportPlaying();
      callbacks.onPlayBlocked();
    },
  });

  /** The entry the engine last put gapless on; anything else is gapless moving by itself. */
  let expected: string | null = null;
  /** Where to start an entry the first time it's current (a restored position). */
  let startAt: { key: string; time: number } | null = null;

  queue.onChange((change) => {
    if (change.currentKey && change.currentKey !== expected) {
      expected = change.currentKey;
      callbacks.onAdvanced(change.currentKey);
    }
    reportStatus(true);
  });

  function sync({ entries, currentKey }: SyncInput): void {
    if (currentKey === null) {
      // Nothing is current (the last entry was removed): stop. Given the list,
      // gapless would start its first entry, a track already played.
      startAt = null;
      expected = null;
      queue.setEntries([], { play: false });
      reportPlaying();
      reportStatus(true);
      return;
    }
    const startTime = startAt && startAt.key === currentKey ? startAt.time : undefined;
    startAt = null;
    const play = queue.isPlaying;
    expected = currentKey;
    const was = queue.currentKey;
    const survives = was !== null && entries.some((e) => e.key === was);
    queue.setEntries(entries, { startKey: currentKey ?? undefined, startTime, play });
    // setEntries keeps a surviving current entry, ignoring startTime: move it
    // if the queue moved, or start it at a pending start time.
    if (queue.currentKey !== currentKey || (survives && startTime !== undefined)) {
      queue.goto(currentKey, { play, startTime });
    }
    reportPlaying();
    reportStatus(true);
  }

  function play(): void {
    void queue.resumeAudioContext();
    queue.play();
    reportPlaying();
  }

  function pause(): void {
    queue.pause();
    reportPlaying();
  }

  return {
    sync,
    /** Start `key` at `time` at the next sync that makes it current (a restored position). */
    startAt(key: string, time: number) {
      startAt = { key, time };
    },
    play,
    pause,
    next: () => queue.next(),
    previous: () => queue.previous(),
    seek: (time: number) => queue.seek(time),
    setVolume: (volume: number) => queue.setVolume(volume),
    get isPlaying() {
      return queue.isPlaying;
    },
    /** For debugging (window.relistenPlayer). */
    queue,
  };
}

export type Engine = ReturnType<typeof createEngine>;
