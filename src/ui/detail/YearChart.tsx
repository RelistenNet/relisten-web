import { Link } from '@timber-js/app/client';
import cn from '@/lib/cn';
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

/** Entries per year as a row of bars; each bar filters the table to its year. */
export default function YearChart({ counts, hrefFor, selectedYear, noun }: Props) {
  const years = [...counts.keys()].map(Number).sort((a, b) => a - b);
  if (years.length < 2) return null;

  const all: string[] = [];
  for (let y = years[0]; y <= years[years.length - 1]; y++) all.push(String(y));
  const max = Math.max(...counts.values());

  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-12 items-end gap-px" role="list" aria-label={`${noun}s by year`}>
        {all.map((year) => {
          const n = counts.get(year) ?? 0;
          const label = `${year}: ${n} ${noun}${n === 1 ? '' : 's'}`;
          const selected = year === selectedYear;
          return (
            <div key={year} role="listitem" className="flex h-full min-w-0 flex-1 items-end">
              {n > 0 ? (
                <Link
                  href={hrefFor(selected ? undefined : year)}
                  scroll={false}
                  title={label}
                  aria-label={label}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'h-(--bar-height) w-full rounded-t-sm hover:bg-accent',
                    selected ? 'bg-accent' : 'bg-accent/40'
                  )}
                  // The bar's share of the busiest year (at least 8%, to stay clickable).
                  style={
                    { '--bar-height': `${Math.max(8, (n / max) * 100)}%` } as React.CSSProperties
                  }
                />
              ) : (
                <span className="h-px w-full bg-hairline" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-sm text-text-muted tabular-nums">
        <span>{all[0]}</span>
        <span>{all[all.length - 1]}</span>
      </div>
    </div>
  );
}
