import type { TrackSong } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import { tableSearchParams } from '@/ui/table/params';
import type { TableSpec } from '@/ui/table/query';

// A show page's table: one tape's tracks, in play order. `?source=` picks the
// tape, as on the browse view; the table has no filters of its own.

/** A track of the show's tape, as a show row (so the song table's play and queue cells work). */
export type ShowTrackRow = ShowRow & {
  /** 1-based, within the tape. */
  position: number;
  songs: TrackSong[];
};

export const SHOW_FILTER_IDS = [] as const;

export const showSearchParams = tableSearchParams(['source']);

export const showTrackSpec: TableSpec<ShowTrackRow> = {
  // Play order only: the table has no sortable columns.
  sorts: { position: (r) => r.position },
  defaultSort: { id: 'position', dir: 'asc' },
  searchText: (r) => r.trackTitle ?? '',
  filters: [],
  // A whole tape on one page: the table has no pager or search box.
  pageSize: 1000,
};
