import { showFilters, showSearchText, showSorts } from '@/ui/shows/columns';
import type { ShowRow } from '@/ui/shows/rows';
import { tableSearchParams } from '@/ui/table/params';
import type { TableSpec } from '@/ui/table/query';

// A song page's table: shared with /api/queue, so "play" on a song page queues
// exactly the rows the page shows, in the same order.

export const SONG_FILTER_IDS = ['year', 'sbd'] as const;

export const songSearchParams = tableSearchParams(SONG_FILTER_IDS);

export const songSpec: TableSpec<ShowRow> = {
  sorts: showSorts,
  defaultSort: { id: 'date', dir: 'desc' },
  searchText: showSearchText,
  filters: [showFilters.year, showFilters.sbd],
  pageSize: 25,
};
