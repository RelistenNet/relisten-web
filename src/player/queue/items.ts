// ---------------------------------------------------------------------------
// Building queue items from the app's data. Shared by pages (client) and
// /api/queue (server); keys are added on the client, with withKeys().
// ---------------------------------------------------------------------------

import type { PlayableTrack, Source } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import type { ContextRef, QueueItem } from './model';

/** A queue item before it has a key. */
export type ItemData = Omit<QueueItem, 'key'>;

export type StreamUrls = { mp3Url: string | null; flacUrl: string | null };

/** Stream URLs by track id. Kept apart from the queue, which is saved. */
export type UrlMap = Record<string, StreamUrls>;

/** A context as /api/queue (or a page) delivers it: items without keys, and their URLs. */
export type ContextPayload = {
  ref: ContextRef;
  label: string;
  items: ItemData[];
  urls: UrlMap;
};

type ShowInfo = { id: string; date: string; venue?: { name?: string } };

/** "Grateful Dead · 1977-05-08" */
export const showLabel = (artistName: string, date: string) =>
  [artistName, date].filter(Boolean).join(' · ');

/** One tape's tracks (all of them, or the ones named in `trackSlugs`), in order. */
export function showContext({
  show,
  source,
  artistSlug,
  artistName,
  trackSlugs,
}: {
  show: ShowInfo;
  source: Source;
  artistSlug: string;
  artistName: string;
  trackSlugs?: readonly string[];
}): ContextPayload {
  const tracks = source.sets
    .flatMap((set) => set.tracks ?? [])
    .filter((t) => !trackSlugs || (t.slug && trackSlugs.includes(t.slug)));
  return {
    ref: { kind: 'show', showId: show.id, sourceId: source.id },
    label: showLabel(artistName, show.date),
    items: tracks.map((t) =>
      trackItem(t, {
        showId: show.id,
        date: show.date,
        artistSlug,
        artistName,
        venue: show.venue?.name,
      })
    ),
    urls: urlsOf(tracks),
  };
}

/** A song page row's performance, or null if it has no file. */
export function songRowItem(row: ShowRow): ItemData | null {
  if (!row.track) return null;
  return trackItem(row.track, {
    showId: row.showId,
    date: row.date,
    artistSlug: row.artistSlug,
    artistName: row.artistName,
    venue: row.venueName,
  });
}

function trackItem(
  t: PlayableTrack,
  show: { showId: string; date: string; artistSlug: string; artistName: string; venue?: string }
): ItemData {
  return {
    trackId: t.id,
    sourceId: t.sourceId,
    showId: show.showId,
    artistSlug: show.artistSlug,
    artistName: show.artistName,
    date: show.date,
    trackSlug: t.slug ?? '',
    title: t.title ?? '',
    ...(t.duration ? { duration: t.duration } : {}),
    ...(show.venue ? { venue: show.venue } : {}),
  };
}

export function urlsOf(tracks: readonly PlayableTrack[]): UrlMap {
  const urls: UrlMap = {};
  for (const t of tracks) urls[t.id] = { mp3Url: t.mp3Url, flacUrl: t.flacUrl ?? null };
  return urls;
}

/** Give items keys (unique per entry; the same track can be queued twice). */
export function withKeys(items: ItemData[], makeKey: () => string = randomKey): QueueItem[] {
  return items.map((item) => ({ ...item, key: makeKey() }));
}

const randomKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
