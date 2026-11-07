// Server-side table querying: search, filter, facet, sort, and page a full row
// list in memory. Tables here are hundreds of rows (a song's shows, a venue's
// shows), so the server holds the whole list in timber's cache and each request
// slices out one page; the browser only ever receives that page.
//
// Pure and framework-free, so it's unit-tested directly (query.test.ts).

export type SortDir = 'asc' | 'desc';
export type SortValue = string | number | null | undefined;

export type TableFilter<Row> =
  | {
      kind: 'select';
      id: string;
      label: string;
      /** The row's value for this filter; null rows match no option. */
      value: (row: Row) => string | null;
      /** Display text for a value (defaults to the value itself). */
      optionLabel?: (value: string) => string;
      /** Option order (default: by count, descending). */
      optionOrder?: 'count' | 'value-asc' | 'value-desc';
    }
  | {
      kind: 'toggle';
      id: string;
      label: string;
      /** Rows kept when the toggle is on. */
      test: (row: Row) => boolean;
    };

export type TableSpec<Row> = {
  /** Sortable columns, by id. */
  sorts: Record<string, (row: Row) => SortValue>;
  defaultSort: { id: string; dir: SortDir };
  /** Text the search box matches against, lowercased by the caller or not. */
  searchText: (row: Row) => string;
  filters: TableFilter<Row>[];
  pageSize: number;
};

/** URL state: `sort` is a column id, `-` prefixed for descending ("-date"). */
export type TableState = {
  q?: string;
  sort?: string;
  page?: number;
  filters: Record<string, string | undefined>;
};

export type FacetOption = { value: string; label: string; count: number };

export type TableResult<Row> = {
  rows: Row[];
  /** Rows matching the search and filters, before paging. */
  total: number;
  /** Every matching row, in order, before paging (a song page's "play" queue). */
  sorted: Row[];
  /** Every row, unfiltered. */
  totalAll: number;
  page: number;
  pageCount: number;
  /** The first row's 1-based position, for "51–100 of 332". */
  start: number;
  sort: { id: string; dir: SortDir };
  /** Options for each select filter, counted with every *other* filter applied. */
  facets: Record<string, FacetOption[]>;
};

export const parseSort = <Row>(spec: TableSpec<Row>, sort: string | undefined) => {
  if (sort) {
    const dir: SortDir = sort.startsWith('-') ? 'desc' : 'asc';
    const id = sort.replace(/^-/, '');
    // Own properties only: `in` would also match inherited ones (?sort=__proto__).
    if (Object.hasOwn(spec.sorts, id) && typeof spec.sorts[id] === 'function') {
      return { id, dir };
    }
  }
  return spec.defaultSort;
};

export const formatSort = (id: string, dir: SortDir) => (dir === 'desc' ? `-${id}` : id);

/** Nulls always sort last, whichever the direction. */
function compare(a: SortValue, b: SortValue, dir: SortDir) {
  const aMissing = a === null || a === undefined || a === '';
  const bMissing = b === null || b === undefined || b === '';
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  const order =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  return dir === 'asc' ? order : -order;
}

export function queryTable<Row>(
  allRows: readonly Row[],
  spec: TableSpec<Row>,
  state: TableState
): TableResult<Row> {
  const terms = (state.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const searched = terms.length
    ? allRows.filter((row) => {
        const text = spec.searchText(row).toLowerCase();
        return terms.every((t) => text.includes(t));
      })
    : allRows;

  const active = spec.filters.filter((f) => state.filters[f.id]);
  const passes = (row: Row, f: TableFilter<Row>) =>
    f.kind === 'toggle' ? f.test(row) : f.value(row) === state.filters[f.id];

  const filtered = searched.filter((row) => active.every((f) => passes(row, f)));

  const facets: Record<string, FacetOption[]> = {};
  for (const f of spec.filters) {
    if (f.kind !== 'select') continue;
    const counts = new Map<string, number>();
    for (const row of searched) {
      if (!active.every((other) => other === f || passes(row, other))) continue;
      const value = f.value(row);
      if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const options = [...counts].map(([value, count]) => ({
      value,
      label: f.optionLabel?.(value) ?? value,
      count,
    }));
    const order = f.optionOrder ?? 'count';
    options.sort((a, b) =>
      order === 'count'
        ? b.count - a.count || a.label.localeCompare(b.label)
        : compare(a.value, b.value, order === 'value-asc' ? 'asc' : 'desc')
    );
    facets[f.id] = options;
  }

  const sort = parseSort(spec, state.sort);
  const sortValue = spec.sorts[sort.id];
  const sorted = [...filtered].sort((a, b) => compare(sortValue(a), sortValue(b), sort.dir));

  const pageCount = Math.max(1, Math.ceil(sorted.length / spec.pageSize));
  const page = Math.min(Math.max(1, Math.floor(state.page ?? 1)), pageCount);
  const offset = (page - 1) * spec.pageSize;

  return {
    rows: sorted.slice(offset, offset + spec.pageSize),
    total: sorted.length,
    sorted,
    totalAll: allRows.length,
    page,
    pageCount,
    start: sorted.length ? offset + 1 : 0,
    sort,
    facets,
  };
}
