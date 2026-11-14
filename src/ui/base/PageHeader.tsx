import { Fragment, type ReactNode } from 'react';
import cn from '@/lib/cn';

// The header every detail page shares: an optional cover, the title, and a
// muted meta line; then key numbers inline and, optionally, a chart. No
// breadcrumb: the artist tabs above already say where the page is. One layout
// everywhere, so pages differ only in what they fill in.

export type StatItem = {
  label: string;
  value: ReactNode;
  /** A muted second line: context for the value ("12% of shows", "3 weeks ago"). */
  detail?: ReactNode;
};

type Props = {
  /** A square image beside the title (ArtistCover). */
  cover?: ReactNode;
  title: ReactNode;
  /** Muted lines under the title, joined with " · ". Falsy entries are dropped. */
  meta?: ReactNode[];
  /** Controls under the title's meta line (a date picker, a scope select). */
  aside?: ReactNode;
  stats?: StatItem[];
  /** Controls at the right end of the title row (a link to another view of the page). */
  actions?: ReactNode;
  /** Full-width content under the title row, such as a YearChart. */
  children?: ReactNode;
};

export default function PageHeader({ cover, title, meta, aside, stats, actions, children }: Props) {
  const metaItems = meta?.filter(Boolean) ?? [];

  return (
    <header className="flex flex-col gap-5">
      {/* Title on the left, stats on the right, centered on each other; the stats wrap under the title when the row is too narrow. */}
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
        <div className="flex max-w-full min-w-0 items-center gap-5">
          {cover && <div className="shrink-0">{cover}</div>}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="mb-0 text-2xl font-semibold tracking-tight text-balance text-text-primary sm:text-3xl">
              {title}
            </h1>
            {metaItems.length > 0 && (
              // A div, not a p: items can be block elements (a tooltip trigger).
              <div className="text-base text-pretty text-text-muted sm:text-sm">
                {metaItems.map((item, i) => (
                  <Fragment key={i}>
                    {i > 0 && <span aria-hidden> · </span>}
                    {item}
                  </Fragment>
                ))}
              </div>
            )}
            {aside && <div className="mt-2 flex">{aside}</div>}
          </div>
        </div>
        {stats && stats.length > 0 && <StatList items={stats} />}
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/**
 * Key numbers in a row, split by hairlines; two columns on narrow screens.
 * Values carry the contrast, so no cards.
 */
function StatList({ items }: { items: StatItem[] }) {
  return (
    <dl className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-0">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            // Cells stretch to the tallest, so the hairlines match; a shorter cell's text sits in the middle.
            'flex min-w-0 flex-col justify-center sm:px-6',
            i === 0 ? 'sm:pl-0' : 'sm:border-l sm:border-hairline',
            i === items.length - 1 && 'sm:pr-0'
          )}
        >
          <dt className="truncate text-sm text-text-muted">{item.label}</dt>
          <dd className="truncate text-lg font-semibold tracking-tight text-text-primary tabular-nums">
            {item.value}
          </dd>
          {item.detail && (
            <dd className="truncate text-sm text-text-muted tabular-nums">{item.detail}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
