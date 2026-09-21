'use client';

import cn from '@/lib/cn';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { Features } from '@/types';
import { Link } from '@timber-js/app/client';
import { useSegmentParams, useRouter } from '@timber-js/app/client';
import { MouseEvent, useTransition } from 'react';

type SubartistTabsProps = {
  artistSlug?: string;
  features?: Features;
};

const SubartistTabs = ({ artistSlug, features }: SubartistTabsProps) => {
  const params = useSegmentParams('/(browse)/[artistSlug]/[year]');
  const year = Array.isArray(params.year) ? params.year[0] : params.year;
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isOnQuickHit = isQuickHitSegment(year);

  const links = [
    { label: 'Years', segment: null },
    { label: 'Recent', segment: 'recently-added' },
    { label: 'Top', segment: 'top' },
    ...(features?.per_show_venues || features?.per_source_venues
      ? [{ label: 'Venues', segment: 'venues' }]
      : []),
    ...(features?.songs ? [{ label: 'Songs', segment: 'songs' }] : []),
    ...(features?.tours ? [{ label: 'Tours', segment: 'tours' }] : []),
  ];

  return (
    <div
      className="
        grid grid-cols-3 gap-1.5 border-b border-hairline bg-surface-raised px-2 py-1.5
      "
    >
      {links.map(({ label, segment }) => {
        const href = segment ? `/${artistSlug}/${segment}` : `/${artistSlug}`;
        const isActive = segment ? year === segment : !isOnQuickHit;

        return (
          <Link
            key={segment ?? '_years'}
            href={href}
            prefetch={false}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              if (e.metaKey || isActive) return;
              e.preventDefault();
              startTransition(() => router.push(href));
            }}
            className={cn(
              'rounded-sm px-2 py-0.5 text-center text-sm transition-colors',
              isActive
                ? 'bg-accent font-medium text-white'
                : `
                  text-text-muted
                  hover:bg-surface-hover hover:text-text-primary
                `,
              isPending && isActive &&
                `
                  bg-accent/40 font-medium text-white/70
                  hover:bg-accent/40 hover:text-white/70
                `
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
};

export default SubartistTabs;
