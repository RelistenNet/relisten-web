import { Link } from '@timber-js/app/client';
import { ArrowDown, ArrowUp } from 'lucide-react';
import cn from '@/lib/cn';
import { tableHref, type TableParams } from '@/ui/table/params';
import { formatSort, type TableResult, type TableSpec } from '@/ui/table/query';
import TablePending from './TablePending';
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
  /** "show" → "Showing 1–50 of 332 shows". */
  noun: string;
  searchPlaceholder: string;
};

const hideClass = { sm: 'max-sm:hidden', md: 'max-md:hidden' } as const;
const plural = (n: number, noun: string) => `${noun}${n === 1 ? '' : 's'}`;

export default function DataTable<Row>({
  pathname,
  params,
  spec,
  result,
  columns,
  rowKey,
  noun,
  searchPlaceholder,
}: Props<Row>) {
  const toolbarFilters: ToolbarFilter[] = spec.filters.map((f) =>
    f.kind === 'select'
      ? { kind: 'select', id: f.id, label: f.label, options: result.facets[f.id] ?? [] }
      : { kind: 'toggle', id: f.id, label: f.label }
  );
  const href = (patch: TableParams) => tableHref(pathname, params, patch);
  const end = result.start + result.rows.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <TableToolbar
        params={params}
        filters={toolbarFilters}
        searchPlaceholder={searchPlaceholder}
      />

      <TablePending>
        <p className="text-base text-text-muted tabular-nums sm:text-sm">
          {result.total === 0
            ? `No ${plural(0, noun)} match.`
            : `Showing ${result.start}–${end} of ${result.total} ${plural(result.total, noun)}`}
          {result.total !== result.totalAll && ` (filtered from ${result.totalAll})`}
        </p>

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

        {result.pageCount > 1 && (
          <Pagination page={result.page} pageCount={result.pageCount} href={href} />
        )}
      </TablePending>
    </div>
  );
}

/** Pages to show: first, last, and a window around the current one. */
function pageList(page: number, pageCount: number) {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

function Pagination({
  page,
  pageCount,
  href,
}: {
  page: number;
  pageCount: number;
  href: (patch: TableParams) => string;
}) {
  const linkClass = 'rounded-md px-2.5 py-1 text-text-secondary hover:bg-surface-hover';
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href({ page: page - 1 })} scroll={false} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <ul role="list" className="flex items-center gap-1 tabular-nums max-sm:hidden">
        {pageList(page, pageCount).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} className="px-1 text-text-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href({ page: p })}
                scroll={false}
                aria-current={p === page ? 'page' : undefined}
                className={cn(linkClass, p === page && 'bg-surface-hover text-text-primary')}
              >
                {p}
              </Link>
            </li>
          )
        )}
      </ul>
      <p className="text-base text-text-muted tabular-nums sm:hidden">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={href({ page: page + 1 })} scroll={false} className={linkClass}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
