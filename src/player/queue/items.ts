// ---------------------------------------------------------------------------
// Building queue items from the app's data, on the server or the client;
// keys are added on the client, with withKeys(). Tracks
// without an mp3 file aren't queued: there'd be nothing to play.
// ---------------------------------------------------------------------------

import type { PlayableTrack, Source } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import type { ContextRef, QueueItem } from './model';

/** A queue item before it has a key. */
export type ItemData = Omit<QueueItem, 'key'>;

/** A context as a page delivers it: items without keys. */
export type ContextPayload = {
  ref: ContextRef;
  label: string;
  items: ItemData[];
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
  const items: ItemData[] = [];
  for (const t of tracks) {
    const item = trackItem(t, {
      showId: show.id,
      date: show.date,
      artistSlug,
      artistName,
      venue: show.venue?.name,
    });
    if (item) items.push(item);
  }
  return {
    ref: { kind: 'show', showId: show.id, sourceId: source.id },
    label: showLabel(artistName, show.date),
    items,
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
): ItemData | null {
  if (!t.mp3Url) return null;
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
    mp3Url: t.mp3Url,
  };
}

/** Give items keys (unique per entry; the same track can be queued twice). */
export function withKeys(items: ItemData[], makeKey: () => string = randomKey): QueueItem[] {
  return items.map((item) => ({ ...item, key: makeKey() }));
}

const randomKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
