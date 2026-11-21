// ---------------------------------------------------------------------------
// What the UI calls to change playback. Queue changes go to the player
// machine (the engine follows); transport (play, pause, seek) goes to the
// engine directly. Components don't touch gapless or the actors.
// ---------------------------------------------------------------------------

import { showContext, type PlayableTape, type ShowInfo } from './queue/items';
import { nextUpKey, type QueueContext, type QueueItem } from './queue/model';
import { loadShowQueue } from './showQueueAction';
import { browserRefusesAutoplay, canAutoplay } from './autoplay';
import { followCurrent, getEngine, playbackActor, playerActor, startPlayback } from './runtime';
import { showPlayPrompt } from './toasts';

/**
 * Play a tape from one of its tracks (a show page, or an embed). Next up is
 * kept. The track that's already current is left as it is (playing or paused).
 *
 * This is the one path a page load takes (the URL means "play this"), so it
 * plays only after the visitor has interacted with the page (canAutoplay);
 * otherwise it queues the tape paused, fetches no audio, and prompts.
 */
export function playShow({
  show,
  source,
  artistSlug,
  artistName,
  trackSlug,
  trackSlugs,
  play = true,
  startTime,
}: {
  show: ShowInfo;
  source: PlayableTape;
  artistSlug: string;
  artistName: string;
  trackSlug?: string;
  trackSlugs?: readonly string[];
  play?: boolean;
  /** Seconds into the track (a `?t=` link). */
  startTime?: number;
}): void {
  const ctx = showContext({ show, source, artistSlug, artistName, trackSlugs });
  const start = ctx.items.find((i) => i.trackSlug === trackSlug) ?? ctx.items[0];
  if (!start) return;
  // This track is already current: the URL names what's playing (it followed
  // playback, or the listener opened the playing track). Keep the queue as it
  // is. Rebuilding the context would undo the listener's removes and moves,
  // and a Next up entry would be swapped for its context copy, moving the
  // cursor and skipping tracks.
  //
  // Playback is left alone too: this runs again whenever the URL follows
  // playback (a skip or a remove while paused mustn't resume), and the
  // search params lag a render behind the path, so a `?t=` from the link
  // that started playback would seek the next track.
  const current = playerActor.getSnapshot().context.queue.current;
  const alreadyCurrent =
    current?.item.trackId === start.trackId && current.item.sourceId === start.sourceId;
  if (alreadyCurrent) return;
  // The entry isn't loaded yet: start it at `startTime` when the engine makes it current.
  if (startTime && startTime > 0) getEngine()?.startAt(start.key, startTime);
  playerActor.send({ type: 'PLAY_CONTEXT', ctx, startKey: start.key });
  if (!play) return;
  if (!canAutoplay()) showPlayPrompt({ blockedByBrowser: false, playNow: startPlayback });
  // The browser has said no already: prompt without an attempt, so nothing downloads.
  else if (browserRefusesAutoplay())
    showPlayPrompt({ blockedByBrowser: true, playNow: startPlayback });
  else startPlayback();
}

/**
 * Play a song page's visible performances, in table order, from one of them.
 * Tracks already in the queue keep their keys, so their loaded audio is kept.
 */
export function playSongRows({
  items,
  label,
  startKey,
  startTime,
}: {
  items: QueueItem[];
  label: string;
  startKey: string;
  /** Seconds into the start entry (a playlist's timestamp link). */
  startTime?: number;
}): void {
  const start = items.find((i) => i.key === startKey);
  if (!start) return;
  // The entry isn't loaded yet: start it at `startTime` when the engine makes it current.
  if (startTime && startTime > 0) getEngine()?.startAt(start.key, startTime);
  playerActor.send({ type: 'PLAY_CONTEXT', ctx: { label, items }, startKey: start.key });
  startPlayback();
}

/**
 * Play a track a track list shows, from the tape the list holds. The URL
 * follows: on the show's pages that is the whole effect of the click, even
 * when the track is already current (playShow leaves it alone).
 */
export function playFromTrackList(args: Parameters<typeof playShow>[0]): void {
  playShow(args);
  followCurrent();
}

/** Give Next up entries keys of their own (the same track can also be in the context). */
const asNextUp = (items: QueueItem[]) =>
  items.map((item) => ({ ...item, key: nextUpKey(item.trackId, newId()) }));

const newId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/** Add to the front of Next up. */
export const playNext = (items: QueueItem[]) =>
  playerActor.send({ type: 'PLAY_NEXT', items: asNextUp(items) });

/** Add to the end of the queue (after the rest of the context). */
export const addToQueue = (items: QueueItem[]) =>
  playerActor.send({ type: 'ADD_TO_QUEUE', items: asNextUp(items) });

/** Move an entry to just after another in the queue panel's list (null: the top); see move(). */
export const moveInQueue = (key: string, after: string | null) =>
  playerActor.send({ type: 'MOVE', key, after });

export const removeFromQueue = (key: string) => playerActor.send({ type: 'REMOVE', key });

/** Play an entry of the queue. */
export function jumpTo(key: string, play = true): void {
  playerActor.send({ type: 'GOTO', key });
  if (play) startPlayback();
}

/** Play a track of the playing context by its track id (an embed's track list). */
export function jumpToTrack(trackId: string, play = true): void {
  const item = playerActor
    .getSnapshot()
    .context.queue.context?.items.find((i) => i.trackId === trackId);
  if (item) jumpTo(item.key, play);
}

// ---- transport ------------------------------------------------------------------

export const play = startPlayback;
export const pause = () => getEngine()?.pause();
export const togglePlayPause = () => (getEngine()?.isPlaying ? pause() : startPlayback());
export const next = () => getEngine()?.next();
export const previous = () => getEngine()?.previous();
export const seek = (time: number) => getEngine()?.seek(time);

/** Set the volume (0–1): the playback actor, the engine and the saved value together. */
export function setVolume(volume: number): void {
  const v = Math.max(0, Math.min(1, volume));
  playbackActor.send({ type: 'VOLUME', volume: v });
  getEngine()?.setVolume(v);
  try {
    localStorage.volume = v;
  } catch {
    // Saving the volume is best-effort.
  }
}

// ---- whole shows (a shows table's rows) -----------------------------------------

/** The last few shows loaded, so a row's Play then Add to queue fetch once. */
const showQueues = new Map<string, Promise<QueueContext | null>>();
const SHOW_QUEUES_MAX = 20;

/** A show's tracks (its first tape). A failure isn't kept, so the next click retries. */
function showQueue(showId: string): Promise<QueueContext | null> {
  let ctx = showQueues.get(showId);
  if (!ctx) {
    ctx = loadShowQueue(showId).catch(() => null);
    showQueues.set(showId, ctx);
    const oldest = showQueues.keys().next().value;
    if (showQueues.size > SHOW_QUEUES_MAX && oldest) showQueues.delete(oldest);
    void ctx.then((c) => c || showQueues.delete(showId));
  }
  return ctx;
}

/** Play a show from its first track, replacing the context (Next up stays). False if it couldn't load. */
export async function playShowById(showId: string): Promise<boolean> {
  const ctx = await showQueue(showId);
  const start = ctx?.items[0];
  if (!ctx || !start) return false;
  playerActor.send({ type: 'PLAY_CONTEXT', ctx, startKey: start.key });
  startPlayback();
  return true;
}

/** A show's tracks (the tape its page opens on), to add to a playlist. */
export async function showTrackIds(showId: string): Promise<{ trackIds: string[] } | null> {
  const ctx = await showQueue(showId);
  return ctx?.items.length ? { trackIds: ctx.items.map((i) => i.trackId) } : null;
}

/** Play next / Add to queue for a whole show. False if it couldn't load. */

export async function queueShow(showId: string, where: 'next' | 'end'): Promise<boolean> {
  const ctx = await showQueue(showId);
  if (!ctx?.items.length) return false;
  (where === 'next' ? playNext : addToQueue)(ctx.items);
  return true;
}
