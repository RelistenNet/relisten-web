import { Fragment, type ReactNode } from 'react';
import { Link } from '@timber-js/app/client';
import { ChevronRightIcon } from 'lucide-react';
import cn from '@/lib/cn';
import type { Crumb } from './crumbs';

// The header every detail page shares: the trail of pages it sits under, an
// optional cover, the title, and a muted meta line; then key numbers inline
// and, optionally, a chart. One layout everywhere, so pages differ only in
// what they fill in. Titles name the page's own thing ("Drums"); the trail
// names what it belongs to ("Grateful Dead › Songs"). Every artist page has
// one, its own tab's included, so switching tabs never moves the header.

export type StatItem = {
  label: string;
  value: ReactNode;
  /** A muted second line: context for the value ("12% of shows", "3 weeks ago"). */
  detail?: ReactNode;
};

type Props = {
  /** Above the title: the pages this one sits under, as links back ("Grateful Dead › Songs ›"). */
  crumbs?: Crumb[];
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

export default function PageHeader({
  crumbs,
  cover,
  title,
  meta,
  aside,
  stats,
  actions,
  children,
}: Props) {
  const metaItems = meta?.filter(Boolean) ?? [];
  const hasStats = !!stats && stats.length > 0;
  const actionList = <div className="flex flex-wrap items-center gap-2">{actions}</div>;

  return (
    <header className="flex flex-col gap-5">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="-mb-4 text-sm">
          <ol role="list" className="m-0 flex list-none flex-wrap items-center p-0">
            {crumbs.map((c, i) => (
              <li key={i} className="m-0 flex">
                {c.href ? (
                  <Link
                    href={c.href}
                    className="
                      -mx-1 inline-flex items-center gap-0.5 rounded px-1 py-1 text-text-muted
                      transition-colors hover:text-accent
                    "
                  >
                    {c.label}
                    <ChevronRightIcon className="size-3.5" aria-hidden />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-0.5 py-1 text-text-muted">
                    {c.label}
                    <ChevronRightIcon className="size-3.5" aria-hidden />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      {/* Title on the left, stats on the right; the stats wrap under the title when the row is
          too narrow. Everything is top-aligned, at least the cover's height: the title sits in the
          same place on every page, with or without a cover, meta lines or stats. */}
      <div className="flex min-h-16 flex-wrap items-start justify-between gap-x-10 gap-y-5">
        <div className="flex max-w-full min-w-0 items-start gap-5">
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
        {hasStats && actions ? (
          // Both on the right, together: the row's space goes before them, not between.
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4 max-sm:w-full">
            <StatList items={stats ?? []} />
            {actionList}
          </div>
        ) : (
          <>
            {hasStats && <StatList items={stats ?? []} />}
            {actions && actionList}
          </>
        )}
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
