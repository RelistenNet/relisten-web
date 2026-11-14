import type { ReactNode } from 'react';
import { Link } from '@timber-js/app/client';
import { ArrowDown, ArrowUp } from 'lucide-react';
import cn from '@/lib/cn';
import { tableHref, type TableParams } from '@/ui/table/params';
import { formatSort, type TableResult, type TableSpec } from '@/ui/table/query';
import Pagination from './Pagination';
import TablePending from './TablePending';
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
  /**
   * Where a row goes: the whole row becomes a click target for it. The cell's
   * own link stays the one keyboard and screen readers use; the row-wide link
   * is a pointer convenience, hidden from them.
   */
  rowHref?: (row: Row) => string;
  /**
   * The table's minimum width (a class); narrower screens scroll it sideways.
   * Tables with few columns can fit a phone with a smaller one.
   */
  minWidth?: string;
  /** "show" → "1–25 of 332 shows". */
  noun: string;
  /** Required unless `controls` is off. */
  searchPlaceholder?: string;
  /**
   * The search box, filters, and pagers (default on). Off for short, fixed
   * lists that always fit one page (a show's tracks): just the table.
   */
  controls?: boolean;
  /**
   * Filters the page sets some other way (the year chart filters by year):
   * shown as a removable chip while active instead of a control.
   */
  chipFilters?: string[];
};

const hideClass = { sm: 'max-sm:hidden', md: 'max-md:hidden' } as const;
/** The sort ids a column's header offers. */
const sortIdsOf = <Row,>(col: Column<Row>) =>
  col.sorts ? col.sorts.map((x) => x.id) : col.sortable ? [col.id] : [];
const plural = (n: number, noun: string) => `${noun}${n === 1 ? '' : 's'}`;
const RESULTS_ID = 'results';

export default function DataTable<Row>({
  pathname,
  params,
  spec,
  result,
  columns,
  rowKey,
  rowHref,
  minWidth = 'min-w-[36rem]',
  noun,
  searchPlaceholder,
  chipFilters = [],
  controls = true,
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
    <div id={RESULTS_ID} className="flex scroll-mt-4 flex-col gap-4">
      {controls && (
        <TableToolbar
          params={params}
          filters={toolbarFilters}
          searchPlaceholder={searchPlaceholder ?? ''}
        />
      )}

      <TablePending className="flex flex-col gap-3">
        {controls && pager('Pagination, top')}

        <div className="overflow-x-auto rounded-xl border border-hairline bg-text-primary/[0.015] shadow-sm">
          <div className="inline-block min-w-full align-middle">
            {/* Fixed layout: column widths come from the <colgroup>, not the rows on
                screen, so paging, sorting, and filtering never shift them. */}
            <table
              className={cn(
                'w-full table-fixed border-separate border-spacing-0 text-left text-base sm:text-sm',
                minWidth
              )}
            >
              <colgroup>
                {columns.map((col) => (
                  <col
                    key={col.id}
                    className={cn(col.width, col.hideBelow && hideClass[col.hideBelow])}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
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
                            className={cn('size-3.5 shrink-0', !active && 'invisible')}
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
                          `
                            h-9 border-b border-hairline px-3 text-[11px] font-semibold
                            tracking-wide whitespace-nowrap text-column-subheader-text uppercase
                          `,
                          col.align === 'right' && 'text-right',
                          col.hideBelow && hideClass[col.hideBelow]
                        )}
                      >
                        {sorts.length ? (
                          <span className="inline-flex items-center gap-3">
                            {sorts.filter((x) => Object.hasOwn(spec.sorts, x.id)).map(sortLink)}
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
              <tbody>
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
                {result.rows.map((row) => {
                  const rowLink = rowHref?.(row);
                  return (
                    <tr
                      key={rowKey(row)}
                      className={cn(
                        // Links and buttons in cells sit above the row-wide link.
                        `
                          even:bg-text-primary/[0.02] hover:bg-text-primary/[0.05]
                          [&_a,&_button,&_[tabindex]]:relative [&_a,&_button,&_[tabindex]]:z-10
                        `,
                        rowLink && 'relative'
                      )}
                    >
                      {columns.map((col, i) => {
                        const sorted = sortIdsOf(col).includes(result.sort.id);
                        return (
                          <td
                            key={col.id}
                            className={cn(
                              'h-11 truncate px-3 py-1.5 tabular-nums',
                              col.align === 'right' && 'text-right',
                              // The main column (the one without a fixed width, which takes the
                              // rest of the row) and the column the list is ranked by are full
                              // strength; the rest are secondary.
                              !col.width || sorted ? 'text-text-primary' : 'text-text-muted',
                              col.hideBelow && hideClass[col.hideBelow]
                            )}
                          >
                            {i === 0 && rowLink && (
                              <Link
                                href={rowLink}
                                tabIndex={-1}
                                aria-hidden
                                className="absolute! inset-0 z-0!"
                              />
                            )}
                            {col.bar ? (
                              <Bar
                                fraction={col.bar.max > 0 ? col.bar.value(row) / col.bar.max : 0}
                              >
                                {col.cell(row)}
                              </Bar>
                            ) : (
                              col.cell(row)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {controls && pager('Pagination, bottom', RESULTS_ID)}
      </TablePending>
    </div>
  );
}

/** A number with a bar to its left, its length a fraction of the column's largest. */
function Bar({ fraction, children }: { fraction: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 min-w-0 flex-1 max-sm:hidden" aria-hidden>
        <div
          className="ml-auto h-full rounded-full bg-accent/40"
          style={{ width: `${Math.min(1, Math.max(0, fraction)) * 100}%` }}
        />
      </div>
      <span className="min-w-[6ch] shrink-0">{children}</span>
    </div>
  );
}
