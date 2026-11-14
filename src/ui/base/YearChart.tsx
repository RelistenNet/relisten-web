import { Link } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { numberFormat } from '@/lib/utils';
import Tooltip from './Tooltip';
import type React from 'react';

type Props = {
  /** Count per year ("1997" → 12). Years in between with no entries show as gaps. */
  counts: Map<string, number>;
  /** The table URL filtered to a year; the selected year links back to all years. */
  hrefFor: (year: string | undefined) => string;
  selectedYear?: string;
  /** "performance" → "1997: 12 performances". */
  noun: string;
};

/**
 * Entries per year as a row of bars; each bar filters the table to its year.
 * Years sit below the bars, as many as fit: each column is a size container,
 * so labels appear by the column's actual width (every year when wide; every
 * 2, 5, or 10 years as it narrows). The busiest and selected years show their
 * count; hovering or focusing any year shows its count and a tooltip.
 */

// Which years get a label at a column width: wider columns label more years.
const yearLabelClass = (year: number) =>
  year % 10 === 0
    ? 'block'
    : year % 5 === 0
      ? 'hidden @min-[0.75rem]:block'
      : year % 2 === 0
        ? 'hidden @min-[1.5rem]:block'
        : 'hidden @min-[2.75rem]:block';
export default function YearChart({ counts, hrefFor, selectedYear, noun }: Props) {
  const years = [...counts.keys()].map(Number).sort((a, b) => a - b);
  if (years.length < 2) return null;

  const all: string[] = [];
  for (let y = years[0]; y <= years[years.length - 1]; y++) all.push(String(y));
  const max = Math.max(...counts.values());

  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-16 items-end gap-px pt-4" role="list" aria-label={`${noun}s by year`}>
        {all.map((year) => {
          const n = counts.get(year) ?? 0;
          const label = `${year}: ${n} ${noun}${n === 1 ? '' : 's'}`;
          const selected = year === selectedYear;
          return (
            <div key={year} role="listitem" className="@container flex h-full min-w-0 flex-1">
              {/* The whole column is the hover target, so short bars are as easy to hit as tall ones. */}
              <Tooltip
                align="top"
                className="flex h-full w-full items-end"
                contentClassName="tabular-nums whitespace-nowrap"
                content={
                  <>
                    <span className="font-semibold">{year}</span>
                    <span className="text-text-muted">
                      {' · '}
                      {n ? `${numberFormat.format(n)} ${noun}${n === 1 ? '' : 's'}` : `no ${noun}s`}
                    </span>
                  </>
                }
              >
                {n > 0 ? (
                  <Link
                    href={hrefFor(selected ? undefined : year)}
                    scroll={false}
                    aria-label={label}
                    aria-current={selected ? 'true' : undefined}
                    className={cn(
                      'group relative h-(--bar-height) w-full rounded-t-sm hover:bg-accent',
                      selected ? 'bg-accent' : 'bg-accent/40'
                    )}
                    // The bar's share of the busiest year (at least 8%, to stay clickable).
                    style={
                      { '--bar-height': `${Math.max(8, (n / max) * 100)}%` } as React.CSSProperties
                    }
                  >
                    <span
                      aria-hidden
                      // Only the busiest and the selected year are labeled; the rest on hover.
                      className={cn(
                        'absolute bottom-full left-1/2 mb-0.5 -translate-x-1/2 text-xs whitespace-nowrap tabular-nums',
                        selected
                          ? 'text-text-primary'
                          : n === max
                            ? 'text-text-muted group-hover:text-text-primary'
                            : 'hidden text-text-primary group-hover:block'
                      )}
                    >
                      {numberFormat.format(n)}
                    </span>
                  </Link>
                ) : (
                  <span className="h-px w-full bg-hairline" />
                )}
              </Tooltip>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="flex h-5 gap-px text-xs text-text-muted tabular-nums">
        {all.map((year) => (
          <div key={year} className="@container relative min-w-0 flex-1">
            <span
              className={cn(
                'absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap',
                // Years without entries stay as gaps, unlabeled.
                counts.get(year) ? yearLabelClass(Number(year)) : 'hidden',
                year === selectedYear && 'font-medium text-text-primary'
              )}
            >
              {year}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
