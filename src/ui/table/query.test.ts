import { describe, expect, it } from 'vitest';
import { formatSort, parseSort, queryTable, type TableSpec } from './query';

type Row = { id: number; artist: string; year: string; sbd: boolean; rating: number | null };

const rows: Row[] = [
  { id: 1, artist: 'Phish', year: '1997', sbd: true, rating: 4.5 },
  { id: 2, artist: 'Grateful Dead', year: '1977', sbd: true, rating: 4.9 },
  { id: 3, artist: 'Phish', year: '1995', sbd: false, rating: null },
  { id: 4, artist: 'Grateful Dead', year: '1977', sbd: false, rating: 3.1 },
  { id: 5, artist: 'Phish', year: '1997', sbd: false, rating: 4.0 },
];

const spec: TableSpec<Row> = {
  sorts: { id: (r) => r.id, artist: (r) => r.artist, rating: (r) => r.rating },
  defaultSort: { id: 'id', dir: 'asc' },
  searchText: (r) => `${r.artist} ${r.year}`,
  filters: [
    { kind: 'select', id: 'artist', label: 'Artist', value: (r) => r.artist },
    { kind: 'select', id: 'year', label: 'Year', value: (r) => r.year, optionOrder: 'value-desc' },
    { kind: 'toggle', id: 'sbd', label: 'SBD', test: (r) => r.sbd },
  ],
  pageSize: 2,
};

const ids = (r: { rows: Row[] }) => r.rows.map((x) => x.id);

describe('queryTable', () => {
  it('pages with the default sort', () => {
    const r = queryTable(rows, spec, { filters: {} });
    expect(ids(r)).toEqual([1, 2]);
    expect(r).toMatchObject({ total: 5, totalAll: 5, page: 1, pageCount: 3, start: 1 });
  });

  it('clamps the page into range', () => {
    expect(queryTable(rows, spec, { page: 99, filters: {} }).page).toBe(3);
    expect(queryTable(rows, spec, { page: -1, filters: {} }).page).toBe(1);
  });

  it('matches every search term, case-insensitively', () => {
    const r = queryTable(rows, { ...spec, pageSize: 10 }, { q: 'phish 1997', filters: {} });
    expect(ids(r)).toEqual([1, 5]);
  });

  it('applies select and toggle filters together', () => {
    const r = queryTable(rows, spec, { filters: { artist: 'Phish', sbd: '1' } });
    expect(ids(r)).toEqual([1]);
  });

  it('counts each facet with the other filters applied, not its own', () => {
    const r = queryTable(rows, spec, { filters: { artist: 'Phish' } });
    expect(r.facets.artist).toEqual([
      { value: 'Phish', label: 'Phish', count: 3 },
      { value: 'Grateful Dead', label: 'Grateful Dead', count: 2 },
    ]);
    expect(r.facets.year.map((o) => [o.value, o.count])).toEqual([
      ['1997', 2],
      ['1995', 1],
    ]);
  });

  it('sorts descending with nulls last', () => {
    const r = queryTable(rows, { ...spec, pageSize: 10 }, { sort: '-rating', filters: {} });
    expect(ids(r)).toEqual([2, 1, 5, 4, 3]);
    const asc = queryTable(rows, { ...spec, pageSize: 10 }, { sort: 'rating', filters: {} });
    expect(ids(asc)).toEqual([4, 5, 1, 2, 3]);
  });

  it('falls back to the default sort for unknown columns', () => {
    expect(parseSort(spec, '-nope')).toEqual({ id: 'id', dir: 'asc' });
    expect(formatSort('rating', 'desc')).toBe('-rating');
  });

  it('reports an empty result as start 0', () => {
    const r = queryTable(rows, spec, { q: 'nothing matches', filters: {} });
    expect(r).toMatchObject({ total: 0, start: 0, page: 1, pageCount: 1, rows: [] });
  });
});
