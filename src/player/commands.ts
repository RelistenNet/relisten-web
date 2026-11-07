// ---------------------------------------------------------------------------
// What the UI calls to change playback. Queue changes go to the player
// machine (the engine follows); transport (play, pause, seek) goes to the
// engine directly. Components don't touch gapless or the actors.
// ---------------------------------------------------------------------------

import type { PlayableTrack, Source } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import { queueSearchParams } from '@/lib/searchParams/queueSearchParams';
import {
  showContext,
  songRowItem,
  urlsOf,
  withKeys,
  type ContextPayload,
  type ItemData,
  type UrlMap,
} from './queue/items';
import type { ContextRef, RepeatMode } from './queue/model';
import { addUrls, getEngine, playerActor } from './runtime';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/**
 * Play a tape from one of its tracks (a show page, or an embed). Next up is
 * kept. Playing the track that's already current just resumes it.
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
  addUrls(payload.urls);
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
  if (play) engine?.play();
}

/**
 * Play a song page's row now, then fill in the rest of the song's queue (every
 * performance matching the page's filters, in table order) once /api/queue
 * answers. The full list keeps the playing entry's key, so nothing restarts.
 */
export function playSongRow({
  row,
  track,
  songSlug,
  params,
}: {
  row: ShowRow;
  track: PlayableTrack;
  songSlug: string;
  /** The song table's URL state (q, sort, filters), without the page. */
  params: Record<string, string>;
}): void {
  const data = songRowItem({ ...row, track });
  if (!data) return;
  const ref: ContextRef = { kind: 'song', artistSlug: row.artistSlug, songSlug, params };
  addUrls(urlsOf([track]));
  const [item] = withKeys([data]);
  playerActor.send({
    type: 'PLAY_CONTEXT',
    ctx: { ref, label: data.title, items: [item] },
    startKey: item.key,
    seed: newSeed(),
  });
  getEngine()?.play();

  void fetch(
    queueSearchParams.href('/api/queue', { artist: row.artistSlug, song: songSlug, ...params })
  )
    .then((res) => (res.ok ? (res.json() as Promise<ContextPayload>) : null))
    .then((payload) => {
      if (!payload) return;
      addUrls(payload.urls);
      playerActor.send({
        type: 'REFRESH_CONTEXT',
        ctx: { ref, label: payload.label, items: withKeys(payload.items) },
      });
    })
    .catch(() => {});
}

/** Add to the front of Next up. */
export function playNext(items: ItemData[], urls: UrlMap): void {
  addUrls(urls);
  playerActor.send({ type: 'PLAY_NEXT', items: withKeys(items) });
}

/** Add to the end of Next up. */
export function addToQueue(items: ItemData[], urls: UrlMap): void {
  addUrls(urls);
  playerActor.send({ type: 'ADD_TO_QUEUE', items: withKeys(items) });
}

/** Play an entry of the queue (the queue panel). */
export function jumpTo(key: string, play = true): void {
  playerActor.send({ type: 'JUMP_TO', key });
  if (play) getEngine()?.play();
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

export const play = () => getEngine()?.play();
export const pause = () => getEngine()?.pause();
export const togglePlayPause = () => getEngine()?.toggle();
export const next = () => getEngine()?.next();
export const previous = () => getEngine()?.previous();
export const seek = (time: number) => getEngine()?.seek(time);

export function setVolume(volume: number): void {
  const v = Math.max(0, Math.min(1, volume));
  getEngine()?.setVolume(v);
  try {
    localStorage.volume = v;
  } catch {
    // Saving the volume is best-effort.
  }
}
