// ---------------------------------------------------------------------------
// What the UI calls to change playback. Queue changes go to the player
// machine (the engine follows); transport (play, pause, seek) goes to the
// engine directly. Components don't touch gapless or the actors.
// ---------------------------------------------------------------------------

import type { Source } from '@/domain/types';
import {
  showContext,
  songRowItem,
  withKeys,
  type ContextPayload,
  type ItemData,
} from './queue/items';
import type { ContextRef, RepeatMode } from './queue/model';
import { canAutoplay } from './autoplay';
import { getEngine, playbackActor, playerActor, startPlayback } from './runtime';
import { showPlayPrompt } from './toasts';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

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
  const payload = showContext({ show, source, artistSlug, artistName, trackSlugs });
  const items = withKeys(payload.items);
  const start = items.find((i) => i.trackSlug === trackSlug) ?? items[0];
  if (!start) return;
  playerActor.send({
    type: 'PLAY_CONTEXT',
    ctx: { ref: payload.ref, label: payload.label, items },
    startKey: start.key,
    seed: newSeed(),
  });
  const engine = getEngine();
  if (startTime && startTime > 0) engine?.seek(startTime);
  if (!play) return;
  if (canAutoplay()) startPlayback();
  else showPlayPrompt({ blockedByBrowser: false, playNow: startPlayback });
}

/**
 * Play a song page's visible performances, in table order, from one of them.
 * Another row on the same page (same filters, sort and page) reuses the
 * queue, so its loaded audio is kept.
 */
export function playSongRows({
  items,
  label,
  startTrackId,
  ref,
}: {
  items: ItemData[];
  label: string;
  startTrackId: string;
  ref: ContextRef;
}): void {
  const keyed = withKeys(items);
  const start = keyed.find((i) => i.trackId === startTrackId);
  if (!start) return;
  playerActor.send({
    type: 'PLAY_CONTEXT',
    ctx: { ref, label, items: keyed },
    startKey: start.key,
    seed: newSeed(),
  });
  startPlayback();
}

/** Add to the front of Next up. */
export function playNext(items: ItemData[]): void {
  playerActor.send({ type: 'PLAY_NEXT', items: withKeys(items) });
}

/** Add to the end of Next up. */
export function addToQueue(items: ItemData[]): void {
  playerActor.send({ type: 'ADD_TO_QUEUE', items: withKeys(items) });
}

/** Play an entry of the queue (the queue panel). */
export function jumpTo(key: string, play = true): void {
  playerActor.send({ type: 'JUMP_TO', key });
  if (play) startPlayback();
}

/** Play a track of the playing context by its track id (an embed's track list). */
export function jumpToTrack(trackId: string, play = true): void {
  const item = playerActor
    .getSnapshot()
    .context.queue.context?.items.find((i) => i.trackId === trackId);
  if (item) jumpTo(item.key, play);
}

export const moveInQueue = (key: string, after: string) =>
  playerActor.send({ type: 'MOVE', key, after });
export const removeFromQueue = (key: string) => playerActor.send({ type: 'REMOVE', key });
export const setShuffle = (on: boolean) =>
  playerActor.send({ type: 'SET_SHUFFLE', seed: on ? newSeed() : null });
export const setRepeat = (repeat: RepeatMode) => playerActor.send({ type: 'SET_REPEAT', repeat });

// ---- transport ------------------------------------------------------------------

export const play = startPlayback;
export const pause = () => getEngine()?.pause();
export function togglePlayPause(): void {
  const engine = getEngine();
  if (!engine) return;
  if (engine.isPlaying || engine.wantsPlay) engine.pause();
  else startPlayback();
}
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
