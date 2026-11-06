import { Link } from '@timber-js/app/client';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import cn from '@/lib/cn';

// A table's pagination bar, rendered above and below the table. Nothing in it
// moves between pages: every button is always rendered (disabled at the ends),
// the page list always has the same number of slots, and each slot is as wide
// as the largest page number.

const SLOTS = 7;

/**
 * The page list as exactly SLOTS entries (or every page, when there are fewer):
 * the first and last pages, the current page with a neighbor on each side, and
 * gaps filling the rest. 1 2 3 4 5 … 20 / 1 … 9 10 11 … 20 / 1 … 16 17 18 19 20
 */
export function pageSlots(page: number, pageCount: number): (number | 'gap')[] {
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (pageCount <= SLOTS) return range(1, pageCount);
  const edge = SLOTS - 2; // pages shown together at either end
  if (page < edge) return [...range(1, edge), 'gap', pageCount];
  if (page > pageCount - edge + 1) return [1, 'gap', ...range(pageCount - edge + 1, pageCount)];
  return [1, 'gap', page - 1, page, page + 1, 'gap', pageCount];
}

type Props = {
  page: number;
  pageCount: number;
  /** The page's URL. */
  hrefFor: (page: number) => string;
  /** "1–25 of 567 shows", at the bar's start. */
  summary: ReactNode;
  label: string;
};

const BUTTON =
  'flex h-8 min-w-8 items-center justify-center px-2 tabular-nums not-first:border-l not-first:border-hairline';

export default function Pagination({ page, pageCount, hrefFor, summary, label }: Props) {
  const pages = Math.max(pageCount, 1);
  // Every page-number slot fits the widest number, so the group never resizes.
  const slotWidth = { '--slot': `calc(${String(pages).length}ch + 1rem)` } as CSSProperties;

  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-4 text-base sm:text-sm"
      style={slotWidth}
    >
      <p className="mb-0 min-w-0 truncate text-text-muted tabular-nums">{summary}</p>
      <div className="flex shrink-0 overflow-hidden rounded-md border border-hairline text-text-secondary">
        <PageButton page={1} current={page} hrefFor={hrefFor} label="First page" hideBelowSm>
          <ChevronsLeft aria-hidden className="size-4" />
        </PageButton>
        <PageButton
          page={page - 1}
          current={page}
          pages={pages}
          hrefFor={hrefFor}
          label="Previous page"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </PageButton>

        {pageSlots(page, pages).map((p, i) =>
          p === 'gap' ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className={cn(BUTTON, 'w-(--slot) text-text-muted max-sm:hidden')}
            >
              …
            </span>
          ) : (
            <PageButton
              key={p}
              page={p}
              current={page}
              hrefFor={hrefFor}
              label={`Page ${p}`}
              className="w-(--slot) max-sm:hidden"
            >
              {p}
            </PageButton>
          )
        )}
        {/* Narrow screens: the position instead of the page list, sized for the widest. */}
        <span
          className={cn(BUTTON, 'text-text-muted sm:hidden')}
          style={{ minWidth: `calc(${String(pages).length * 2 + 4}ch + 1rem)` }}
        >
          {page} of {pages}
        </span>

        <PageButton
          page={page + 1}
          current={page}
          pages={pages}
          hrefFor={hrefFor}
          label="Next page"
        >
          <ChevronRight aria-hidden className="size-4" />
        </PageButton>
        <PageButton
          page={pages}
          current={page}
          pages={pages}
          hrefFor={hrefFor}
          label="Last page"
          hideBelowSm
        >
          <ChevronsRight aria-hidden className="size-4" />
        </PageButton>
      </div>
    </nav>
  );
}

/**
 * A link to `page`, or a disabled placeholder of the same size when `page` is
 * out of range. The current page is marked, not linked.
 */
function PageButton({
  page,
  current,
  pages = Infinity,
  hrefFor,
  label,
  className,
  hideBelowSm,
  children,
}: {
  page: number;
  current: number;
  pages?: number;
  hrefFor: (page: number) => string;
  label: string;
  className?: string;
  hideBelowSm?: boolean;
  children: ReactNode;
}) {
  const classes = cn(BUTTON, className, hideBelowSm && 'max-sm:hidden');
  const isNumber = typeof children === 'number';

  if (isNumber && page === current) {
    return (
      <span
        aria-current="page"
        className={cn(classes, 'bg-surface-hover font-medium text-text-primary')}
      >
        {children}
      </span>
    );
  }
  if (page < 1 || page > pages || (!isNumber && page === current)) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(classes, 'text-text-muted/40')}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={hrefFor(page)}
      scroll={false}
      aria-label={label}
      className={cn(classes, 'hover:bg-surface-hover hover:text-text-primary')}
    >
      {children}
    </Link>
  );
}
