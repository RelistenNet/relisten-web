import type { ReactNode } from 'react';

export type StatItem = {
  label: string;
  value: ReactNode;
  /** A muted second line: context for the value ("12% of shows", "3 weeks ago"). */
  detail?: ReactNode;
};

/**
 * Key numbers for a detail page header, one card each. The grid fills the row
 * and wraps on its own, so it works for any number of stats at any width.
 */
export default function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="
            flex min-w-0 flex-col gap-1 rounded-xl bg-surface-raised p-4 inset-ring
            inset-ring-hairline
          "
        >
          <dt className="truncate text-sm text-text-muted">{item.label}</dt>
          <dd className="truncate text-2xl font-semibold tracking-tight text-text-primary tabular-nums">
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
