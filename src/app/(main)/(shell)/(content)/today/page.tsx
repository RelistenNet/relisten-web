import { href } from '@timber-js/app/routes';
import { loadTodayRows } from '@/features/today/load';
import TodayIndex from '@/features/today/TodayIndex';
import { playShowColumn, queueShowColumn } from '@/player/showColumns';
import { getCurrentMonthDay } from '@/lib/timezone';
import { dateSearchParams } from '@/lib/searchParams/dateSearchParam';
import { todayIndexSearchParams } from '@/lib/searchParams/todayIndexSearchParams';
import { numberFormat } from '@/lib/utils';
import PageHeader from '@/ui/base/PageHeader';
import YearChart from '@/ui/base/YearChart';
import { showStats } from '@/ui/shows/stats';
import TodayDateNav from '@/ui/base/TodayDateNav';
import { ALL_ARTISTS_CRUMB } from '@/ui/base/crumbs';
import { showColumns, showFilters, showSearchText } from '@/ui/shows/columns';
import type { ShowRow } from '@/ui/shows/rows';
import DataTable from '@/ui/table/DataTable';
import { tableHref, tableSearchParams, toTableState, type TableParams } from '@/ui/table/params';
import { queryTable, type TableSpec } from '@/ui/table/query';
import type { Column } from '@/ui/table/types';

// Every artist's shows on a calendar date: the show table every listing page
// uses, 25 shows a page like the rest, grouped by artist, with an index of the
// artists beside it that links to the page each one starts on.

const PAGE_SIZE = 25;
const FILTER_IDS = ['year', 'sbd'] as const;
const searchParams = tableSearchParams(FILTER_IDS);

/** Rows stay grouped by artist, so no column sorts. */
const fixed = (col: Column<ShowRow>): Column<ShowRow> => ({
  ...col,
  sorts: undefined,
  sortable: false,
});

const columns = [
  playShowColumn,
  fixed(showColumns.show),
  fixed(showColumns.tapes),
  fixed(showColumns.rating),
  fixed(showColumns.plays),
  queueShowColumn,
];

export default async function Page() {
  const [currentMonthDay, parsed, table, index] = await Promise.all([
    getCurrentMonthDay(),
    dateSearchParams.get(),
    searchParams.get(),
    todayIndexSearchParams.get(),
  ]);

  const month = String(parsed.month ?? currentMonthDay.month);
  const day = String(parsed.day ?? currentMonthDay.day);
  const rows = await loadTodayRows(Number(month), Number(day));
  // What the table's links keep: the date and the index's order, as given.
  const params: TableParams = {
    ...(table as TableParams),
    month: parsed.month,
    day: parsed.day,
    ...(index.sort !== 'default' && { sort: index.sort, dir: index.dir }),
  };

  // The rows' order: grouped by artist (loadTodayRows sorts them).
  const order = new Map(rows.map((r, i) => [r.id, i]));
  const spec: TableSpec<ShowRow> = {
    sorts: { order: (r) => order.get(r.id) },
    defaultSort: { id: 'order', dir: 'asc' },
    searchText: showSearchText,
    filters: [showFilters.year, showFilters.sbd],
    pageSize: PAGE_SIZE,
  };
  const state = toTableState(params, FILTER_IDS);
  const result = queryTable(rows, spec, state);
  // Every row the search and filters keep, in order: where each artist starts.
  const kept = queryTable(
    rows,
    { ...spec, pageSize: rows.length || 1 },
    { ...state, page: 1 }
  ).rows;

  // Each artist's show count and the page their shows start on.
  const counts = new Map<string, { name: string; count: number; first: number }>();
  kept.forEach((r, i) => {
    const entry = counts.get(r.artistSlug) ?? { name: r.artistName, count: 0, first: i };
    entry.count++;
    counts.set(r.artistSlug, entry);
  });
  const artists = [...counts].map(([anchor, { name, count, first }]) => ({
    name,
    anchor,
    count,
    href: tableHref(href('/today'), params, {
      page: Math.floor(first / PAGE_SIZE) + 1,
      anchor,
    }),
  }));

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        crumbs={[ALL_ARTISTS_CRUMB]}
        title="Today in History"
        aside={<TodayDateNav month={month} day={day} pathname={href('/today')} />}
        stats={[
          { label: 'Shows', value: numberFormat.format(rows.length) },
          {
            label: 'Artists',
            value: numberFormat.format(new Set(rows.map((r) => r.artistSlug)).size),
          },
        ]}
      >
        <YearChart
          counts={showStats(rows).byYear}
          noun="show"
          selectedYear={params.year as string | undefined}
          hrefFor={(year) => tableHref(href('/today'), params, { year })}
        />
      </PageHeader>

      <div className="flex items-start gap-8">
        <TodayIndex items={artists} />
        <div className="min-w-0 flex-1">
          <DataTable
            pathname={href('/today')}
            params={params}
            spec={spec}
            result={result}
            columns={columns}
            rowKey={(r) => r.id}
            rowHref={(r) => r.href}
            groupBy={(r) => {
              const n = counts.get(r.artistSlug)?.count ?? 0;
              return {
                key: r.artistSlug,
                anchor: r.artistSlug,
                label: r.artistName,
                detail: `${numberFormat.format(n)} ${n === 1 ? 'show' : 'shows'}`,
              };
            }}
            noun="show"
            searchPlaceholder="Search artists, venues, cities"
            chipFilters={['year']}
          />
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Today in History',
};
