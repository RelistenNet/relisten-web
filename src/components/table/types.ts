import type { ReactNode } from 'react';
import type { FacetOption } from '@/lib/table/query';

export type Column<Row> = {
  id: string;
  label: string;
  /** Sortable when the table spec has a sort with this id. */
  sortable?: boolean;
  /** Direction on first click (default ascending). */
  firstDir?: 'asc' | 'desc';
  /**
   * For a column showing several fields: one sort link per field in the
   * header ("Date · Venue"). Replaces `label`/`sortable` for the header.
   */
  sorts?: { id: string; label: string; firstDir?: 'asc' | 'desc' }[];
  align?: 'left' | 'right';
  /** Header text for screen readers only (an icon column, say). */
  srOnlyLabel?: boolean;
  /**
   * Width class for the column (e.g. "w-20"). Tables use a fixed layout, so
   * widths never shift with the rows on screen; leave one column without a
   * width to take the remaining space.
   */
  width?: string;
  /** Hide on narrow screens. */
  hideBelow?: 'sm' | 'md';
  cell: (row: Row) => ReactNode;
};

/** A filter as the (client) toolbar sees it: serializable, options precomputed. */
export type ToolbarFilter =
  | { kind: 'select'; id: string; label: string; options: FacetOption[] }
  | { kind: 'toggle'; id: string; label: string };
