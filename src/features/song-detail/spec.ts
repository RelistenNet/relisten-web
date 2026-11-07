import { showFilters, showSearchText, showSorts } from '@/ui/shows/columns';
import type { ShowRow } from '@/ui/shows/rows';
import { tableSearchParams } from '@/ui/table/params';
import type { TableSpec } from '@/ui/table/query';

// A song page's table: its rows, filters and URL state. Shared by the page
// (server) and its play buttons (client), which queue the rows on screen.

export const SONG_FILTER_IDS = ['year', 'sbd'] as const;

export const songSearchParams = tableSearchParams(SONG_FILTER_IDS);

export const songSpec: TableSpec<ShowRow> = {
  sorts: showSorts,
  defaultSort: { id: 'date', dir: 'desc' },
  searchText: showSearchText,
  filters: [showFilters.year, showFilters.sbd],
  pageSize: 25,
};
