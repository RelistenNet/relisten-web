// ---------------------------------------------------------------------------
// The player's runtime: the two actors, and (in the browser) the engine,
// storage and side effects wired to them. Imported by client components.
//
// On the server only the actors exist, at their initial snapshots, so server
// HTML and the first client render match; the saved queue is read after
// hydration (hydratePlayer, from Providers).
// ---------------------------------------------------------------------------

import { Queue } from 'gapless';
import { createActor } from 'xstate';
import { replaceUrl } from '@timber-js/app/client';
import { playerLogic, restores } from './queueLogic';
import { playbackLogic } from './playback';
import { compose, type QueueItem, type QueueState } from './queue/model';
import { createQueueStorage, type QueueStorage } from './queue/storage';
import { createEngine, type Engine, type EngineEntry } from './engine';
import { proxyStreamUrl } from './proxyStreamUrl';
import { createListenTracker } from './listenTracker';
import { scrobblePlay } from './scrobble';
import {
  dismissAutoplayToast,
  dismissPlaybackFailure,
  showPlaybackFailure,
  showPlayPrompt,
} from './toasts';
import { diagnose, diagnoseStall, parseGaplessError } from './failure';
import { rememberListener } from './autoplay';
import { savedVolume } from './volume';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { trackHref, type TrackRoute } from '@/ui/shows/trackHref';
import { splitShowDate } from '@/lib/utils';

declare global {
  interface Window {
    /** For debugging in the console. */
    relistenPlayer?: unknown;
  }
}

export const playerActor = createActor(playerLogic);
export const playbackActor = createActor(playbackLogic);
playerActor.start();
playbackActor.start();

const isBrowser = typeof window !== 'undefined';

function toEntry(item: QueueItem): EngineEntry {
  return {
    key: item.key,
    url: proxyStreamUrl(item.mp3Url) ?? item.mp3Url,
    metadata: {
      trackId: item.trackId,
      title: item.title,
      artist: item.artistName,
      album: [item.date, item.venue].filter(Boolean).join(' · '),
      artwork: [{ src: `/album-art/${item.showId}.png`, sizes: '550x550', type: 'image/png' }],
    },
  };
}

// ---- the browser side --------------------------------------------------------

let engine: Engine | null = null;
let storage: QueueStorage | null = null;
/**
 * Entries that failed to play, with their report once diagnosed (see
 * reportFailure). gapless can't reload an entry's audio, so playing one again
 * shows the report again instead of pretending to play.
 */
const failed = new Map<string, Parameters<typeof showPlaybackFailure>[0] | null>();

/** Make gapless match the queue, with whatever stream URLs are known now. */
function syncEngine(queue: QueueState, list = compose(queue)): void {
  engine?.sync({
    entries: list.map(toEntry),
    currentKey: queue.current?.key ?? null,
  });
}

export const getEngine = () => engine;

if (isBrowser) {
  const mobile =
    window.matchMedia?.('(pointer: coarse)')?.matches ||
    (navigator.maxTouchPoints > 0 && window.matchMedia?.('(hover: none)')?.matches) ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const listens = createListenTracker();
  const queueOf = () => playerActor.getSnapshot().context.queue;
  const saving = () => playerActor.getSnapshot().context.mode === 'ready';
  // Progress frames arrive ~60 times a second: index the queue once per change.
  let indexed: { queue: QueueState; byKey: Map<string, QueueItem> } | null = null;
  const itemFor = (key: string) => {
    const queue = queueOf();
    if (indexed?.queue !== queue) {
      indexed = { queue, byKey: new Map(compose(queue).map((i) => [i.key, i])) };
    }
    return indexed.byKey.get(key);
  };

  engine = createEngine(
    (callbacks) =>
      new Queue({
        // Mobile browsers suspend Web Audio in the background; HTML5 keeps playing.
        playbackMethod: mobile ? 'HTML5_ONLY' : 'HYBRID',
        // No downloads until audio plays; the engine turns preloading on then.
        preloadNumTracks: 0,
        onDebug: (msg) => console.debug('[gapless]', msg),
        ...callbacks,
      }),
    {
      onAdvanced: (key) => playerActor.send({ type: 'GOTO', key }),
      onProgress: ({ key, currentTime, duration, isPaused }) => {
        playbackActor.send({ type: 'PROGRESS', key, currentTime, duration });
        if (!isPaused) dismissAutoplayToast();
        const item = itemFor(key);
        if (!item) return;
        watchStall(item, currentTime, isPaused);
        if (listens.progress(key, { currentTime, isPaused })) scrobblePlay(item.trackId);
        if (saving()) {
          storage?.savePosition({
            key,
            time: currentTime,
            ...(Number.isFinite(duration) ? { duration } : {}),
          });
        }
      },
      onPlayingChange: (playing) => {
        playbackActor.send({ type: 'PLAYING', playing });
        // Someone who started playback by interacting autoplays next time.
        if (playing) rememberListener();
      },
      onStatus: (statuses) => playbackActor.send({ type: 'STATUS', statuses }),
      onError: (error) => reportFailure(error),
      onPlayBlocked: () => showPlayPrompt({ blockedByBrowser: true, playNow: startPlayback }),
    }
  );

  // ---- failures --------------------------------------------------------------

  const STALL_MS = 20_000;
  let stall = { key: '', time: -1, since: 0, reported: false };

  const isProxied = (item: QueueItem) => toEntry(item).url !== item.mp3Url;
  const hasNext = (key: string) => {
    const list = compose(queueOf());
    return list.findIndex((i) => i.key === key) < list.length - 1;
  };

  /** The HTTP status gapless's download of `url` got (see failure.ts), if the browser says. */
  const downloadStatus = (url: string): number | undefined => {
    const entries = performance.getEntriesByName?.(url) ?? [];
    const download = entries
      .filter((e): e is PerformanceResourceTiming => 'initiatorType' in e)
      .filter((e) => e.initiatorType === 'fetch')
      .at(-1);
    return typeof download?.responseStatus === 'number' ? download.responseStatus : undefined;
  };
  // Keep recording downloads in long sessions (the default buffer holds 250 entries).
  performance.addEventListener?.('resourcetimingbufferfull', () =>
    performance.clearResourceTimings()
  );

  /** Run `then` once gapless's download of `key` has settled (or after 3s). */
  const whenDownloadSettles = (key: string, then: () => void, waited = 0) => {
    const status = playbackActor.getSnapshot().context.statuses[key];
    if (status !== 'LOADING' || waited >= 3000) then();
    else setTimeout(() => whenDownloadSettles(key, then, waited + 250), 250);
  };

  /** gapless couldn't play an entry: pause on it and say why, as best we can tell. */
  const reportFailure = (error: Error): void => {
    const parsed = parseGaplessError(error);
    const current = queueOf().current?.item;
    // An entry loading ahead shows its error on its row; only the current one is news.
    if (!current || (parsed.key && parsed.key !== current.key) || failed.has(current.key)) return;
    failed.set(current.key, null);
    const { url } = toEntry(current);
    // Later, not here: gapless reports some errors from inside its own play handling, which
    // would undo a pause made now (the bar would keep showing "playing").
    whenDownloadSettles(current.key, () => {
      if (queueOf().current?.key !== current.key) return;
      engine?.pause();
      const { description } = diagnose({
        mp3Url: current.mp3Url,
        proxied: isProxied(current),
        online: navigator.onLine,
        status: downloadStatus(url),
        mediaErrorCode: parsed.mediaErrorCode,
      });
      const report = {
        title: current.title,
        description,
        skip: hasNext(current.key) ? () => engine?.next() : undefined,
      };
      failed.set(current.key, report);
      showPlaybackFailure(report);
    });
  };

  /** Playing, but the position hasn't moved for a while: say it's slow, once per entry. */
  const watchStall = (item: QueueItem, currentTime: number, isPaused: boolean): void => {
    const now = Date.now();
    if (isPaused || stall.key !== item.key || currentTime !== stall.time) {
      // Playing on from where it was: whatever was reported for it is over.
      const playedOn = !isPaused && stall.key === item.key && currentTime > stall.time;
      if (playedOn && (stall.reported || failed.delete(item.key))) dismissPlaybackFailure();
      stall = { key: item.key, time: currentTime, since: now, reported: false };
      return;
    }
    if (stall.reported || failed.has(item.key) || now - stall.since < STALL_MS) return;
    stall.reported = true;
    showPlaybackFailure({
      title: item.title,
      stalled: true,
      ...diagnoseStall(item.mp3Url, isProxied(item), navigator.onLine),
      skip: hasNext(item.key) ? () => engine?.next() : undefined,
    });
  };

  // Volume lives in the playback actor; the engine follows it.
  const volume = savedVolume();
  engine.setVolume(volume);
  playbackActor.send({ type: 'VOLUME', volume });

  storage = createQueueStorage({ storage: window.localStorage });
  window.addEventListener('pagehide', () => storage?.flush());

  // ---- reacting to the machine ----------------------------------------------

  let lastQueue: QueueState | null = null;
  let lastSaved: QueueState | null = null;
  let lastCurrent: string | null = null;

  playerActor.subscribe((snapshot) => {
    const { queue, mode } = snapshot.context;
    // Saved separately from the change check: becoming ready (after
    // hydration) must save the queue a page started while booting, even
    // though the queue itself didn't change.
    if (mode === 'ready' && queue !== lastSaved) {
      lastSaved = queue;
      storage?.saveQueue(queue);
    }
    if (queue === lastQueue) return;
    lastQueue = queue;

    const list = compose(queue);
    syncEngine(queue, list);

    const current = queue.current?.item ?? null;
    // Another entry: an earlier one's failure is no longer news, and this one gets a fresh report.
    if (current?.key !== lastCurrent) {
      failed.clear();
      dismissPlaybackFailure();
    }
    // Not while booting: the URL already names the track the page started, and
    // following it would drop a `?t=` that hydratePlayer still needs to see.
    if (current && current.key !== lastCurrent && mode !== 'booting') followPlayback(current);
    lastCurrent = current?.key ?? null;
  });

  window.relistenPlayer = { playerActor, playbackActor, engine };
}

/**
 * Point the URL and title at the playing track, while the page shows its
 * show (a track page of it, in the same route). The queue never navigates.
 */
function followPlayback(item: QueueItem): void {
  const { pathname, search } = window.location;
  const route: TrackRoute = pathname.startsWith('/embed-track')
    ? 'embed-track'
    : pathname.startsWith('/embed')
      ? 'embed'
      : 'site';
  const { year, month, day } = splitShowDate(item.date);
  if (!item.trackSlug || !pathname.includes(`/${item.artistSlug}/${year}/${month}/${day}`)) return;
  const next = trackHref(
    route,
    { artistSlug: item.artistSlug, year, month, day, songSlug: item.trackSlug },
    sourceQuery(item.sourceId)
  );
  if (pathname + search !== next) replaceUrl(next);
  // "Song | 1977-05-08 | Grateful Dead | Relisten": replace only the song.
  const parts = document.title.split(' | ');
  parts[0] = item.title;
  document.title = parts.join(' | ');
}

/** Start playback (every play goes through here: transport, prompts, autoplay). */
export function startPlayback(): void {
  const key = playerActor.getSnapshot().context.queue.current?.key;
  const failure = key ? failed.get(key) : undefined;
  if (failure) {
    showPlaybackFailure(failure);
    return;
  }
  engine?.play();
}

// ---- hydration ----------------------------------------------------------------

/**
 * Read the saved queue, after hydration so the first render matched the
 * server's. A page that already started playback keeps its queue. Embeds
 * play one show and save nothing.
 */
export function hydratePlayer(): void {
  if (!isBrowser) return;
  if (playerActor.getSnapshot().context.mode !== 'booting') return;
  if (window.location.pathname.startsWith('/embed')) {
    playerActor.send({ type: 'EMBED' });
    return;
  }
  const saved = storage?.loadQueue() ?? null;
  const position = storage?.loadPosition();
  const page = playerActor.getSnapshot().context.queue;
  // A `?t=` link picks its own position.
  const linkedTime = !!page.current && new URLSearchParams(window.location.search).has('t');
  if (restores(page, saved) && position && !linkedTime && saved.current?.key === position.key) {
    engine?.startAt(position.key, position.time);
    playbackActor.send({
      type: 'RESTORED',
      key: position.key,
      currentTime: position.time,
      duration: position.duration,
    });
  }
  // A page that started another track keeps it; the saved queue is dropped.
  playerActor.send({ type: 'HYDRATE', saved });
}
