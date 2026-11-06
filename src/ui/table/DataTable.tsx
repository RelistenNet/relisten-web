import { Link } from '@timber-js/app/client';
import { ArrowDown, ArrowUp } from 'lucide-react';
import cn from '@/lib/cn';
import { tableHref, type TableParams } from '@/ui/table/params';
import { formatSort, type TableResult, type TableSpec } from '@/ui/table/query';
import Pagination from './Pagination';
import TablePending, { TableState } from './TablePending';
import { numberFormat } from '@/lib/utils';
import TableToolbar from './TableToolbar';
import type { Column, ToolbarFilter } from './types';

// A server-rendered, URL-driven table: rows, sort headers, and pagination are
// plain links rendered on the server (no client JS); only the search box and
// filter controls are a client island.

type Props<Row> = {
  pathname: string;
  params: TableParams;
  spec: TableSpec<Row>;
  result: TableResult<Row>;
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  /** "show" → "1–25 of 332 shows". */
  noun: string;
  searchPlaceholder: string;
  /**
   * Filters the page sets some other way (the year chart filters by year):
   * shown as a removable chip while active instead of a control.
   */
  chipFilters?: string[];
};

const hideClass = { sm: 'max-sm:hidden', md: 'max-md:hidden' } as const;
const plural = (n: number, noun: string) => `${noun}${n === 1 ? '' : 's'}`;
const RESULTS_ID = 'results';

export default function DataTable<Row>({
  pathname,
  params,
  spec,
  result,
  columns,
  rowKey,
  noun,
  searchPlaceholder,
  chipFilters = [],
}: Props<Row>) {
  const toolbarFilters: ToolbarFilter[] = spec.filters.map((f): ToolbarFilter => {
    if (chipFilters.includes(f.id)) {
      const value = params[f.id];
      return {
        kind: 'chip',
        id: f.id,
        label: f.label,
        valueLabel: result.facets[f.id]?.find((o) => o.value === value)?.label,
      };
    }
    return f.kind === 'select'
      ? { kind: 'select', id: f.id, label: f.label, options: result.facets[f.id] ?? [] }
      : { kind: 'toggle', id: f.id, label: f.label };
  });
  const clearAll: TableParams = Object.fromEntries([
    ['q', undefined],
    ...spec.filters.map((f) => [f.id, undefined]),
  ]);
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const href = (patch: TableParams) => tableHref(pathname, params, patch);
  const end = result.start + result.rows.length - 1;
  const summary = (
    <>
      {result.total === 0
        ? `0 ${plural(0, noun)}`
        : `${result.start}–${end} of ${numberFormat.format(result.total)}`}
      {result.total > 0 && (
        // Narrow screens drop the noun so the range fits beside the buttons.
        <span className="max-sm:hidden"> {plural(result.total, noun)}</span>
      )}
      {result.total !== result.totalAll && (
        <span className="max-sm:hidden">
          {' '}
          (filtered from {numberFormat.format(result.totalAll)})
        </span>
      )}
    </>
  );
  // The same bar above and below the table.
  const pager = (label: string, hash?: string) => (
    <Pagination
      label={label}
      hash={hash}
      page={result.page}
      pageCount={result.pageCount}
      hrefFor={(page) => href({ page })}
      summary={summary}
    />
  );

  return (
    // The bottom pager links back here, so a new page starts at the top of the table.
    <TableState>
      <div id={RESULTS_ID} className="flex scroll-mt-4 flex-col gap-4">
        <TableToolbar
          params={params}
          filters={toolbarFilters}
          searchPlaceholder={searchPlaceholder}
        />

        <TablePending className="flex flex-col gap-3">
          {pager('Pagination, top')}

          <div className="-mx-4 -my-2 overflow-x-auto">
            <div className="inline-block min-w-full px-4 py-2 align-middle">
              {/* Fixed layout: column widths come from the <colgroup>, not the rows on
                screen, so paging, sorting, and filtering never shift them. */}
              <table className="w-full min-w-[36rem] table-fixed text-left text-base sm:text-sm">
                <colgroup>
                  {columns.map((col) => (
                    <col
                      key={col.id}
                      className={cn(col.width, col.hideBelow && hideClass[col.hideBelow])}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-hairline">
                    {columns.map((col) => {
                      const sorts =
                        col.sorts ??
                        (col.sortable
                          ? [{ id: col.id, label: col.label, firstDir: col.firstDir }]
                          : []);
                      const activeSort = sorts.find((x) => x.id === result.sort.id);
                      const Arrow = result.sort.dir === 'asc' ? ArrowUp : ArrowDown;
                      const sortLink = (x: (typeof sorts)[number]) => {
                        const active = x.id === result.sort.id;
                        const nextDir = active
                          ? result.sort.dir === 'asc'
                            ? 'desc'
                            : 'asc'
                          : (x.firstDir ?? 'asc');
                        return (
                          <Link
                            key={x.id}
                            href={href({ sort: formatSort(x.id, nextDir) })}
                            scroll={false}
                            className={cn(
                              'inline-flex items-center gap-1 hover:text-text-primary',
                              active && 'text-text-primary'
                            )}
                          >
                            {x.label}
                            {/* Always rendered (invisible when inactive) so changing the sort
                              never shifts the header. */}
                            <Arrow
                              className={cn('size-4 shrink-0', !active && 'invisible')}
                              aria-hidden
                            />
                          </Link>
                        );
                      };
                      return (
                        <th
                          key={col.id}
                          scope="col"
                          aria-sort={
                            activeSort
                              ? result.sort.dir === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : undefined
                          }
                          className={cn(
                            'py-2 pr-4 font-medium whitespace-nowrap text-text-secondary last:pr-0',
                            col.align === 'right' && 'text-right',
                            col.hideBelow && hideClass[col.hideBelow]
                          )}
                        >
                          {sorts.length ? (
                            <span className="inline-flex items-center gap-3">
                              {sorts.filter((x) => x.id in spec.sorts).map(sortLink)}
                            </span>
                          ) : (
                            <span className={col.srOnlyLabel ? 'sr-only' : undefined}>
                              {col.label}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {result.rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="py-10 text-center text-text-muted">
                        {result.totalAll === 0 ? (
                          <p className="mb-0">No {plural(0, noun)} yet.</p>
                        ) : (
                          <>
                            <p className="mb-2">
                              {query
                                ? `No ${plural(0, noun)} match “${query}”.`
                                : `No ${plural(0, noun)} match these filters.`}
                            </p>
                            <Link
                              href={href(clearAll)}
                              scroll={false}
                              className="text-accent hover:underline"
                            >
                              Clear search and filters
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                  {result.rows.map((row) => (
                    <tr key={rowKey(row)}>
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            'truncate py-2 pr-4 text-text-primary tabular-nums last:pr-0',
                            col.align === 'right' && 'text-right',
                            col.hideBelow && hideClass[col.hideBelow]
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pager('Pagination, bottom', RESULTS_ID)}
        </TablePending>
      </div>
    </TableState>
  );
}
