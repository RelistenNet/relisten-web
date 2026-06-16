'use client';

import cn from '@/lib/cn';
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

  const isOnQuickHit = ['recently-added', 'top', 'venues', 'songs', 'tours'].includes(year ?? '');

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
      {links.map(({ label, segment }) => (
        <QuickHitsPill
          key={segment ?? '_years'}
          label={label}
          href={segment ? `/${artistSlug}/${segment}` : `/${artistSlug}`}
          isActive={segment ? year === segment : !isOnQuickHit}
        />
      ))}
    </div>
  );
};

const QuickHitsPill = ({
  label,
  href,
  isActive,
}: {
  label: string;
  href: string;
  isActive: boolean;
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || isActive) return;
    e.preventDefault();
    startTransition(() => router.push(href));
  };

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        'rounded-sm px-2 py-0.5 text-center text-sm transition-colors',
        isActive
          ? 'bg-accent font-medium text-white'
          : `
            text-text-muted
            hover:bg-surface-hover hover:text-text-primary
          `,
        isPending &&
          `
            bg-accent/60 text-white
            hover:bg-accent/60 hover:text-white
          `
      )}
    >
      {label}
    </Link>
  );
};

export default SubartistTabs;
