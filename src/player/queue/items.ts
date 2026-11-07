// ---------------------------------------------------------------------------
// Building queue items from the app's data, on the server or the client.
// Tracks without an mp3 file aren't queued: there'd be nothing to play.
// ---------------------------------------------------------------------------

import type { PlayableTrack, Source } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import type { QueueContext, QueueItem } from './model';

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
}): QueueContext {
  const tracks = source.sets
    .flatMap((set) => set.tracks ?? [])
    .filter((t) => !trackSlugs || (t.slug && trackSlugs.includes(t.slug)));
  const items: QueueItem[] = [];
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
    label: showLabel(artistName, show.date),
    items,
  };
}

/** A song page row's performance, or null if it has no file. */
export function songRowItem(row: ShowRow): QueueItem | null {
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
): QueueItem | null {
  if (!t.mp3Url) return null;
  return {
    key: t.id,
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
