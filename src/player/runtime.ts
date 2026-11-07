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
import { playerLogic } from './queueLogic';
import { playbackLogic } from './playback';
import { compose, type QueueItem, type QueueState } from './queue/model';
import { createQueueStorage, type QueueStorage } from './queue/storage';
import { createEngine, type Engine, type EngineEntry } from './engine';
import { proxyStreamUrl } from './proxyStreamUrl';
import { createListenTracker } from './listenTracker';
import { scrobblePlay } from './scrobble';
import { dismissAutoplayToast, showAudioError, showPlayPrompt } from './toasts';
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
  const itemFor = (key: string) => compose(queueOf()).find((i) => i.key === key);

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
        if (listens.progress(item.trackId, { currentTime, isPaused })) scrobblePlay(item.trackId);
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
      onError: () => showAudioError(),
      onPlayBlocked: () => showPlayPrompt({ blockedByBrowser: true, playNow: startPlayback }),
    }
  );

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
    if (current && current.key !== lastCurrent) followPlayback(current);
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
  const pageStarted = !!playerActor.getSnapshot().context.queue.current;
  if (saved && position && !pageStarted && saved.current?.key === position.key) {
    engine?.startAt(position.key, position.time);
    playbackActor.send({
      type: 'RESTORED',
      key: position.key,
      currentTime: position.time,
      duration: position.duration,
    });
  }
  // A page that already started playback keeps it; the saved queue is dropped.
  playerActor.send({ type: 'HYDRATE', saved });
}
