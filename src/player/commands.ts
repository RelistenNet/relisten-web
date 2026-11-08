// ---------------------------------------------------------------------------
// What the UI calls to change playback. Queue changes go to the player
// machine (the engine follows); transport (play, pause, seek) goes to the
// engine directly. Components don't touch gapless or the actors.
// ---------------------------------------------------------------------------

import type { Source } from '@/domain/types';
import { showContext } from './queue/items';
import { nextUpKey, type QueueItem } from './queue/model';
import { canAutoplay } from './autoplay';
import { getEngine, playbackActor, playerActor, startPlayback } from './runtime';
import { showPlayPrompt } from './toasts';

/**
 * Play a tape from one of its tracks (a show page, or an embed). Next up is
 * kept. Playing the track that's already current just resumes it.
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
  show: { id: string; date: string; venue?: { name?: string } };
  source: Source;
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
  const current = playerActor.getSnapshot().context.queue.current;
  const alreadyCurrent =
    current?.item.trackId === start.trackId && current.item.sourceId === start.sourceId;
  if (!alreadyCurrent) playerActor.send({ type: 'PLAY_CONTEXT', ctx, startKey: start.key });
  const engine = getEngine();
  if (startTime && startTime > 0) engine?.seek(startTime);
  if (!play) return;
  if (canAutoplay()) startPlayback();
  else showPlayPrompt({ blockedByBrowser: false, playNow: startPlayback });
}

/**
 * Play a song page's visible performances, in table order, from one of them.
 * Tracks already in the queue keep their keys, so their loaded audio is kept.
 */
export function playSongRows({
  items,
  label,
  startTrackId,
}: {
  items: QueueItem[];
  label: string;
  startTrackId: string;
}): void {
  const start = items.find((i) => i.trackId === startTrackId);
  if (!start) return;
  playerActor.send({ type: 'PLAY_CONTEXT', ctx: { label, items }, startKey: start.key });
  startPlayback();
}

/** Give Next up entries keys of their own (the same track can also be in the context). */
const asNextUp = (items: QueueItem[]) =>
  items.map((item) => ({ ...item, key: nextUpKey(item.trackId, newId()) }));

const newId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/** Add to the front of Next up. */
export const playNext = (items: QueueItem[]) =>
  playerActor.send({ type: 'PLAY_NEXT', items: asNextUp(items) });

/** Add to the end of Next up. */
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
