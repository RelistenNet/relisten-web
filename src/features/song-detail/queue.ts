import 'server-only';

import { loadSong } from './load';
import { SONG_FILTER_IDS, songSpec } from './spec';
import { songRowItem, urlsOf, type ContextPayload, type ItemData } from '@/player/queue/items';
import { queryTable } from '@/ui/table/query';
import { toTableState, type TableParams } from '@/ui/table/params';
import type { PlayableTrack } from '@/domain/types';

/** The song table's URL state that decides its rows (no page). */
export function songQueueParams(params: TableParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ['q', 'sort', ...SONG_FILTER_IDS]) {
    const value = params[key];
    if (value !== undefined && value !== '') out[key] = String(value);
  }
  return out;
}

/**
 * Every performance on a song page with these params, in table order: the
 * queue its play buttons start. One request, whatever the page size.
 */
export async function songQueue(
  artistSlug: string,
  songSlug: string,
  params: Record<string, string>
): Promise<ContextPayload> {
  const song = await loadSong(artistSlug, songSlug);
  const result = queryTable(song.rows, songSpec, toTableState(params, SONG_FILTER_IDS));
  const items: ItemData[] = [];
  const tracks: PlayableTrack[] = [];
  for (const row of result.sorted) {
    const item = songRowItem(row);
    if (item && row.track) {
      items.push(item);
      tracks.push(row.track);
    }
  }
  return {
    ref: { kind: 'song', artistSlug, songSlug: song.slug ?? songSlug, params },
    label: [song.name, params.year].filter(Boolean).join(' · '),
    items,
    urls: urlsOf(tracks),
  };
}
