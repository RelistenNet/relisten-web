import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import type { TableState } from './query';

// A table's URL state: ?q=…&sort=-date&page=2 plus one param per filter
// (?artist=phish&sbd=1). Every view of a table is a shareable link.
// Shared by server (parsing) and client (building hrefs).

export const tableSearchParams = (filterIds: readonly string[]) =>
  defineSearchParams({
    q: z.string().trim().max(100).optional(),
    sort: z.string().max(40).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    ...Object.fromEntries(filterIds.map((id) => [id, z.string().max(100).optional()])),
  });

/** Flat URL values for a table, as the page received them. */
export type TableParams = Record<string, string | number | undefined>;

export const toTableState = (params: TableParams, filterIds: readonly string[]): TableState => ({
  q: params.q as string | undefined,
  sort: params.sort as string | undefined,
  page: params.page as number | undefined,
  filters: Object.fromEntries(filterIds.map((id) => [id, params[id] as string | undefined])),
});

/**
 * The URL for this table with `patch` applied. Any change other than paging
 * goes back to page 1; empty values and page 1 are left out of the URL.
 */
export function tableHref(pathname: string, params: TableParams, patch: TableParams) {
  const next: TableParams = { ...params, ...patch };
  if (!('page' in patch)) next.page = undefined;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === '' || (key === 'page' && Number(value) <= 1)) continue;
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `${pathname}?${query}` : pathname;
}
