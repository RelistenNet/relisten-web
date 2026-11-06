import DataTable from '@/ui/table/DataTable';
import { showFilters, showSearchText, showSorts } from '@/ui/shows/columns';
import type { Column } from '@/ui/table/types';
import { tableHref, tableSearchParams, toTableState, type TableParams } from '@/ui/table/params';
import { showStats } from '@/ui/shows/stats';
import YearChart from '@/ui/base/YearChart';
import { queryTable, type SortDir, type TableSpec } from '@/ui/table/query';
import type { ShowRow } from '@/ui/shows/rows';
import { artistUrl } from '@/lib/urls';
import { Link } from '@timber-js/app/client';
import type { ReactNode } from 'react';

// An artist's list of shows as a table page: top rated, recently added, on a
// date, a tour. Each page passes its rows, columns, and default order.

const FILTER_IDS = ['year', 'sbd'] as const;
const searchParams = tableSearchParams(FILTER_IDS);

type Props = {
  artistSlug: string;
  artistName: string;
  title: string;
  /** A muted line under the title. */
  subtitle?: ReactNode;
  /** Extra header content (stats, a date picker). */
  children?: ReactNode;
  rows: ShowRow[];
  columns: Column<ShowRow>[];
  defaultSort: { id: string; dir: SortDir };
  pathname: string;
  /** Page params the table's links must keep (today-in-history's ?month=&day=). */
  extraParams?: TableParams;
  /** Replaces the default breadcrumb (a link to the artist). */
  breadcrumb?: ReactNode;
  /** Shows per year as bars that filter the table to a year. */
  yearChart?: boolean;
};

export default async function ArtistShowList({
  artistSlug,
  artistName,
  title,
  subtitle,
  children,
  rows,
  columns,
  defaultSort,
  pathname,
  extraParams,
  breadcrumb,
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
    <div className="detail-page flex flex-col gap-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <nav aria-label="Breadcrumb" className="text-base text-text-muted sm:text-sm">
            {breadcrumb ?? (
              <Link href={artistUrl(artistSlug)} className="hover:text-text-primary">
                {artistName}
              </Link>
            )}
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base text-pretty text-text-muted sm:text-sm">{subtitle}</p>
          )}
        </div>
        {children}
        {yearChart && (
          <YearChart
            counts={showStats(rows).byYear}
            noun="show"
            selectedYear={params.year as string | undefined}
            hrefFor={(year) => tableHref(pathname, params, { year })}
          />
        )}
      </header>
      <DataTable
        pathname={pathname}
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(r) => r.id}
        noun="show"
        searchPlaceholder="Search venues, cities, dates"
      />
    </div>
  );
}
