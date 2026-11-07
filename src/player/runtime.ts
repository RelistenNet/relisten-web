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
import { playerMachine } from './player.machine';
import { playbackLogic } from './playback';
import { compose, type QueueItem, type QueueState } from './queue/model';
import type { StreamUrls, UrlMap } from './queue/items';
import { createQueueStorage, type QueueStorage } from './queue/storage';
import { createEngine, type Engine, type EngineEntry } from './engine';
import { proxyStreamUrl } from './proxyStreamUrl';
import { createListenTracker } from './listenTracker';
import { scrobblePlay } from './scrobble';
import { dismissAutoplayToast, showAudioError, showPlayPrompt } from './toasts';
import { queueSearchParams, MAX_QUEUE_SHOWS } from '@/lib/searchParams/queueSearchParams';
import { createUrlResolver } from './queue/resolver';
import { rememberListener } from './autoplay';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { trackHref, type TrackRoute } from '@/ui/shows/trackHref';
import { splitShowDate } from '@/lib/utils';

declare global {
  interface Window {
    /** Set to prefer FLAC streams. */
    FLAC: string;
    /** For debugging in the console. */
    relistenPlayer?: unknown;
  }
}

export const playerActor = createActor(playerMachine);
export const playbackActor = createActor(playbackLogic);
playerActor.start();
playbackActor.start();

const isBrowser = typeof window !== 'undefined';

// ---- stream URLs ------------------------------------------------------------

/** Stream URLs by track id; not saved (they're fetched again after a reload). */
const urls = new Map<string, StreamUrls>();

export function addUrls(map: UrlMap): void {
  for (const [trackId, u] of Object.entries(map)) urls.set(trackId, u);
}

function streamUrl(trackId: string): string | null {
  const u = urls.get(trackId);
  if (!u) return null;
  return proxyStreamUrl(window.FLAC ? u.flacUrl || u.mp3Url : u.mp3Url);
}

function toEntry(item: QueueItem): EngineEntry {
  const url = streamUrl(item.trackId);
  return {
    key: item.key,
    url,
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
    repeat: queue.repeat,
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
      onAdvanced: (key) => playerActor.send({ type: 'ADVANCED', key }),
      onProgress: ({ key, currentTime, duration, isPaused }) => {
        playbackActor.send({ type: 'PROGRESS', key, currentTime, duration });
        if (!isPaused) dismissAutoplayToast();
        const item = itemFor(key);
        if (!item) return;
        if (listens.progress(item.trackId, { currentTime, isPaused })) scrobblePlay(item.trackId);
        if (playerActor.getSnapshot().matches('ready')) {
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
        // The tab that starts playback owns the saved queue.
        if (playing && playerActor.getSnapshot().matches('ready')) storage?.claim();
      },
      onStatus: (statuses) => playbackActor.send({ type: 'STATUS', statuses }),
      onError: () => showAudioError(),
      onPlayBlocked: () => showPlayPrompt({ blockedByBrowser: true, playNow: startPlayback }),
    }
  );

  const volume = Number(localStorage.volume);
  if (Number.isFinite(volume) && localStorage.volume !== undefined) engine.setVolume(volume);

  storage = createQueueStorage({
    storage: window.localStorage,
    // Lazy: embeds never save, so they never need (or write) a tab id.
    tabId,
  });
  window.addEventListener('pagehide', () => storage?.flush());

  // ---- reacting to the machine ----------------------------------------------

  let lastQueue: QueueState | null = null;
  let lastSaved: QueueState | null = null;
  let lastCurrent: string | null = null;

  playerActor.subscribe((snapshot) => {
    const queue = snapshot.context.queue;
    // Saved separately from the change check: becoming ready (after
    // hydration) must save the queue a page started while booting, even
    // though the queue itself didn't change.
    if (snapshot.matches('ready') && queue !== lastSaved) {
      lastSaved = queue;
      storage?.saveQueue(queue);
    }
    if (queue === lastQueue) return;
    lastQueue = queue;

    const list = compose(queue);
    syncEngine(queue, list);
    void resolver.kick();

    const current = queue.current?.item ?? null;
    if (current && current.key !== lastCurrent) followPlayback(current);
    lastCurrent = current?.key ?? null;
  });

  window.relistenPlayer = { playerActor, playbackActor, engine, urls };
}

/**
 * This tab's id for the saved queue's owner rule. In sessionStorage, so a
 * reload is the same tab (and still owns the queue it saved).
 */
function tabId(): string {
  const make = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  try {
    let id = sessionStorage.getItem('relisten.tab');
    if (!id) {
      id = make();
      sessionStorage.setItem('relisten.tab', id);
    }
    return id;
  } catch {
    return make();
  }
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

// ---- fetching what's missing --------------------------------------------------

const resolver = createUrlResolver({
  has: (trackId) => urls.has(trackId),
  add: addUrls,
  fetchUrls: async (shows) => {
    const res = await fetch(queueSearchParams.href('/api/queue', { shows: shows.join(',') }));
    if (!res.ok) throw new Error(`/api/queue ${res.status}`);
    return (await res.json()) as { urls: UrlMap; failed?: string[] };
  },
  latest: () => {
    const queue = playerActor.getSnapshot().context.queue;
    return { list: compose(queue), current: queue.current?.item ?? null };
  },
  // Rebuild the entries from the queue as it is now, with the new URLs.
  onResolved: () => syncEngine(playerActor.getSnapshot().context.queue),
  batchSize: MAX_QUEUE_SHOWS,
});

/**
 * Start playback. If the current entry has no URL yet (a reload, a failed
 * request), the engine waits for it, and the URLs are fetched again now:
 * the listener asked, so don't wait out the retry backoff.
 */
export function startPlayback(): void {
  if (!engine) return;
  engine.play();
  if (engine.wantsPlay) void resolver.kick({ force: true });
}

// ---- hydration ----------------------------------------------------------------

/**
 * Read the saved queue, after hydration so the first render matched the
 * server's. A page that already started playback keeps its show. Embeds
 * play one show and save nothing.
 */
export function hydratePlayer(): void {
  if (!isBrowser) return;
  if (!playerActor.getSnapshot().matches('booting')) return;
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
  playerActor.send({ type: 'HYDRATE', saved });
}
