import DataTable from '@/ui/table/DataTable';
import { showFilters, showSearchText, showSorts } from '@/ui/shows/columns';
import type { Column } from '@/ui/table/types';
import { tableHref, tableSearchParams, toTableState, type TableParams } from '@/ui/table/params';
import { showStats } from '@/ui/shows/stats';
import YearChart from '@/ui/base/YearChart';
import { queryTable, type SortDir, type TableSpec } from '@/ui/table/query';
import type { ShowRow } from '@/ui/shows/rows';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader, { type StatItem } from '@/ui/base/PageHeader';
import type { Artist } from '@/domain/types';
import type { ReactNode } from 'react';

// An artist's list of shows as a table page: top rated, recently added, on a
// date, a tour. Each page passes its rows, columns, and default order.

const FILTER_IDS = ['year', 'sbd'] as const;
const searchParams = tableSearchParams(FILTER_IDS);

type Props = {
  artist: Artist;
  title: string;
  /** Muted lines under the title. */
  meta?: ReactNode[];
  stats?: StatItem[];
  /** Controls beside the title (a date picker). */
  aside?: ReactNode;
  rows: ShowRow[];
  columns: Column<ShowRow>[];
  defaultSort: { id: string; dir: SortDir };
  pathname: string;
  /** Page params the table's links must keep (today-in-history's ?month=&day=). */
  extraParams?: TableParams;
  /** Shows per year as bars that filter the table to a year. */
  yearChart?: boolean;
};

export default async function ArtistShowList({
  artist,
  title,
  meta,
  stats,
  aside,
  rows,
  columns,
  defaultSort,
  pathname,
  extraParams,
  yearChart,
}: Props) {
  const params: TableParams = { ...(await searchParams.get()), ...extraParams };
  const spec: TableSpec<ShowRow> = {
    sorts: showSorts,
    defaultSort,
    searchText: showSearchText,
    filters: [showFilters.year, showFilters.sbd],
    pageSize: 25,
  };
  const result = queryTable(rows, spec, toTableState(params, FILTER_IDS));

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={<ArtistCover artist={artist} />}
        title={title}
        meta={meta}
        stats={stats}
        aside={aside}
      >
        {yearChart && (
          <YearChart
            counts={showStats(rows).byYear}
            noun="show"
            selectedYear={params.year as string | undefined}
            hrefFor={(year) => tableHref(pathname, params, { year })}
          />
        )}
      </PageHeader>
      <DataTable
        pathname={pathname}
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(r) => r.id}
        rowHref={(r) => r.href}
        noun="show"
        searchPlaceholder="Search venues, cities, dates"
        chipFilters={yearChart ? ['year'] : undefined}
      />
    </div>
  );
}
