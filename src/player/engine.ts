// ---------------------------------------------------------------------------
// The engine: the one place that talks to gapless.
//
// The player machine holds the queue; the engine makes gapless match it.
// sync() is safe to repeat: gapless reconciles by key, so unchanged entries
// cost nothing and the playing one is never interrupted. When gapless moves
// on by itself (a track ends, the OS media keys skip), onAdvanced reports the
// new key so the machine can record it. The engine's own jumps don't echo.
//
// Entries join gapless once their stream URL is known. While the current
// entry has none (after a reload, before /api/queue answers), gapless is left
// alone, and a play() waits for it.
// ---------------------------------------------------------------------------

import type {
  Entry,
  QueueChange,
  RepeatMode,
  TrackInfo,
  TrackMetadata,
  WebAudioLoadingState,
} from 'gapless';

export type EngineEntry = { key: string; url: string | null; metadata: TrackMetadata };

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
  setRepeat(mode: RepeatMode): void;
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
  repeat: RepeatMode;
};

const STATUS_INTERVAL_MS = 250;

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
  /** The latest state, kept so a deferred sync can run when URLs arrive. */
  let latest: SyncInput | null = null;
  /** A play() made before the current entry could play. */
  let wantPlay = false;
  /** Where to start an entry the first time it loads (a restored position). */
  let startAt: { key: string; time: number } | null = null;

  queue.onChange((change) => {
    if (change.currentKey && change.currentKey !== expected) {
      expected = change.currentKey;
      callbacks.onAdvanced(change.currentKey);
    }
    reportStatus(true);
  });

  function sync(input: SyncInput): void {
    latest = input;
    queue.setRepeat(input.repeat);
    const playable = input.entries.filter((e): e is EngineEntry & { url: string } => !!e.url);
    const { currentKey } = input;

    // The current entry can't play yet: leave gapless alone until it can.
    if (currentKey && !playable.some((e) => e.key === currentKey)) return;

    const startTime = startAt && startAt.key === currentKey ? startAt.time : undefined;
    const play = wantPlay || queue.isPlaying;
    expected = currentKey;
    queue.setEntries(
      playable.map((e) => ({ key: e.key, url: e.url, metadata: e.metadata })),
      { startKey: currentKey ?? undefined, startTime, play }
    );
    // setEntries keeps a surviving current entry; move it if the queue moved.
    if (currentKey && queue.currentKey !== currentKey) {
      queue.goto(currentKey, { play, startTime });
    }
    if (currentKey && queue.currentKey === currentKey) {
      if (startTime !== undefined) startAt = null;
      if (wantPlay) {
        wantPlay = false;
        queue.play();
      }
    }
    reportPlaying();
    reportStatus(true);
  }

  /** Whether the current entry is in gapless (has a URL). */
  const ready = () => !!latest?.currentKey && queue.currentKey === latest.currentKey;

  function play(): void {
    void queue.resumeAudioContext();
    if (!ready()) {
      wantPlay = true;
      return;
    }
    queue.play();
    reportPlaying();
  }

  function pause(): void {
    wantPlay = false;
    queue.pause();
    reportPlaying();
  }

  return {
    sync,
    /** Re-run the last sync (after URLs arrive). */
    resync: () => {
      if (latest) sync(latest);
    },
    /** Start `key` at `time` once it can play (a restored position). */
    startAt(key: string, time: number) {
      startAt = { key, time };
    },
    play,
    pause,
    toggle: () => (queue.isPlaying || wantPlay ? pause() : play()),
    next: () => queue.next(),
    previous: () => queue.previous(),
    seek: (time: number) => queue.seek(time),
    setVolume: (volume: number) => queue.setVolume(volume),
    get isPlaying() {
      return queue.isPlaying;
    },
    /** Waiting to play until the current entry can (no URL yet). */
    get wantsPlay() {
      return wantPlay;
    },
    /** For debugging (window.relistenPlayer). */
    queue,
  };
}

export type Engine = ReturnType<typeof createEngine>;
